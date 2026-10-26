type MpesaConfig = {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  callbackUrl: string;
  baseUrl: string;
};

export function getMpesaConfig(): MpesaConfig {
  const environment = process.env["MPESA_ENVIRONMENT"] ?? "sandbox";
  const config = {
    consumerKey: process.env["MPESA_CONSUMER_KEY"],
    consumerSecret: process.env["MPESA_CONSUMER_SECRET"],
    shortcode: process.env["MPESA_SHORTCODE"],
    passkey: process.env["MPESA_PASSKEY"],
    callbackUrl: process.env["MPESA_CALLBACK_URL"],
    baseUrl: environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke",
  };
  const missing = Object.entries(config)
    .filter(([key, value]) => key !== "baseUrl" && !value)
    .map(([key]) => key);
  if (missing.length) throw new Error(`Missing M-Pesa server configuration: ${missing.join(", ")}`);
  return config as MpesaConfig;
}

export function mpesaTimestamp(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}${value("month")}${value("day")}${value("hour")}${value("minute")}${value("second")}`;
}

export async function getMpesaAccessToken(config: MpesaConfig): Promise<string> {
  const credentials = btoa(`${config.consumerKey}:${config.consumerSecret}`);
  const response = await fetch(`${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  const body = (await response.json()) as { access_token?: string };
  if (!response.ok || !body.access_token) throw new Error("Could not authenticate with M-Pesa");
  return body.access_token;
}

export async function queryMpesaPayment(
  config: MpesaConfig,
  accessToken: string,
  checkoutRequestId: string,
): Promise<boolean> {
  const timestamp = mpesaTimestamp();
  const password = btoa(`${config.shortcode}${config.passkey}${timestamp}`);
  const response = await fetch(`${config.baseUrl}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  if (!response.ok) return false;
  const body = (await response.json()) as { ResultCode?: number | string };
  return String(body.ResultCode) === "0";
}