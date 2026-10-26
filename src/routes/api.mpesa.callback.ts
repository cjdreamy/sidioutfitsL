import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mpesa/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = (await request.json()) as {
            Body?: { stkCallback?: {
              CheckoutRequestID?: string;
              ResultCode?: number;
              CallbackMetadata?: { Item?: Array<{ Name?: string; Value?: string | number }> };
            } };
          };
          const callback = payload.Body?.stkCallback;
          if (!callback?.CheckoutRequestID || callback.ResultCode !== 0) {
            return Response.json({ ResultCode: 0, ResultDesc: "Acknowledged" });
          }

          const { getMpesaAccessToken, getMpesaConfig, queryMpesaPayment } = await import("@/lib/mpesa.server");
          const config = getMpesaConfig();
          const accessToken = await getMpesaAccessToken(config);
          if (!(await queryMpesaPayment(config, accessToken, callback.CheckoutRequestID))) {
            return Response.json({ ResultCode: 0, ResultDesc: "Acknowledged" });
          }

          const items = callback.CallbackMetadata?.Item ?? [];
          const receipt = items.find((item) => item.Name === "MpesaReceiptNumber")?.Value;
          const paidAmount = Number(items.find((item) => item.Name === "Amount")?.Value);
          if (!receipt || !Number.isFinite(paidAmount)) {
            return Response.json({ ResultCode: 0, ResultDesc: "Acknowledged" });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("id, amount_due_now")
            .eq("checkout_request_id", callback.CheckoutRequestID)
            .maybeSingle();
          if (order && Number(order.amount_due_now) === paidAmount) {
            await supabaseAdmin
              .from("orders")
              .update({ payment_status: "paid", mpesa_receipt: String(receipt) })
              .eq("id", order.id);
          }
          return Response.json({ ResultCode: 0, ResultDesc: "Acknowledged" });
        } catch (error) {
          console.error("M-Pesa callback processing failed", error);
          return Response.json({ ResultCode: 0, ResultDesc: "Acknowledged" });
        }
      },
    },
  },
});