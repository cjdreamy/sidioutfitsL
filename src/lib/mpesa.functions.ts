import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ orderId: z.string().uuid(), estimatedFare: z.number().int().min(0).max(50000) });

function normalizeKenyanPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("0") ? `254${digits.slice(1)}` : digits.startsWith("254") ? digits : `254${digits}`;
  return /^254[17]\d{8}$/.test(normalized) ? normalized : null;
}

export const startMpesaPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    const { data: prepared, error: prepareError } = await context.supabase.rpc("prepare_order_payment", {
      _order_id: data.orderId,
      _estimated_fare: data.estimatedFare,
    });
    if (prepareError || !prepared?.[0]) {
      return { success: false, message: prepareError?.message ?? "Could not prepare this order's payment." };
    }

    const order = prepared[0];
    const phone = normalizeKenyanPhone(order.phone);
    if (!phone) {
      await context.supabase.rpc("fail_order_payment_request", { _order_id: data.orderId });
      return { success: false, message: "Add a valid Kenyan phone number to receive the M-Pesa prompt." };
    }

    try {
      const { getMpesaAccessToken, getMpesaConfig, mpesaTimestamp } = await import("@/lib/mpesa.server");
      const config = getMpesaConfig();
      const accessToken = await getMpesaAccessToken(config);
      const timestamp = mpesaTimestamp();
      const deposit = Math.ceil(Number(order.total) * 0.3);
      const amount = deposit + data.estimatedFare;
      const password = btoa(`${config.shortcode}${config.passkey}${timestamp}`);
      if (amount < 1) {
        await context.supabase.rpc("fail_order_payment_request", { _order_id: data.orderId });
        return { success: false, message: "The payment amount must be at least KSh 1." };
      }
      const response = await fetch(`${config.baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          BusinessShortCode: config.shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: phone,
          PartyB: config.shortcode,
          PhoneNumber: phone,
          CallBackURL: config.callbackUrl,
          AccountReference: "SidiOutfits",
          TransactionDesc: "Order deposit and estimated fare",
        }),
      });
      const result = (await response.json()) as { ResponseCode?: string; CheckoutRequestID?: string; errorMessage?: string };
      if (!response.ok || result.ResponseCode !== "0" || !result.CheckoutRequestID) {
        await context.supabase.rpc("fail_order_payment_request", { _order_id: data.orderId });
        return { success: false, message: result.errorMessage ?? "Safaricom did not accept the payment request." };
      }

      const { error: saveError } = await context.supabase.rpc("finish_order_payment_request", {
        _order_id: data.orderId,
        _checkout_request_id: result.CheckoutRequestID,
      });
      if (saveError) {
        await context.supabase.rpc("fail_order_payment_request", { _order_id: data.orderId });
        return { success: false, message: "The payment request started, but its status could not be saved. Contact the shop before retrying." };
      }
      return { success: true, message: "Payment request sent." };
    } catch (error) {
      await context.supabase.rpc("fail_order_payment_request", { _order_id: data.orderId });
      const message = error instanceof Error ? error.message : "Payment request failed.";
      return { success: false, message };
    }
  });