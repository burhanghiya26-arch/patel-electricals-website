import crypto from "crypto";

const RAZORPAY_API_URL = "https://api.razorpay.com/v1";
const FAILURE_LOG_INTERVAL_MS = 60_000;
const lastFailureLogAt = new Map<string, number>();

function getCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || "";

  if (!keyId || !keySecret) {
    throw new Error(
      "Online payments are not configured yet. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the server environment.",
    );
  }

  if (!keyId.startsWith("rzp_")) {
    throw new Error(
      "RAZORPAY_KEY_ID is not a valid Razorpay Key ID. Check that the Key ID and Key Secret were not swapped.",
    );
  }

  return { keyId, keySecret };
}

function logRequestFailure(status: number, code: string | undefined) {
  const key = `${status}:${code || "unknown"}`;
  const now = Date.now();
  const previousLogAt = lastFailureLogAt.get(key) || 0;

  if (now - previousLogAt < FAILURE_LOG_INTERVAL_MS) return;

  lastFailureLogAt.set(key, now);
  console.error("[Razorpay] API request failed", {
    status,
    code: code || "unknown",
  });
}

function authHeaders() {
  const { keyId, keySecret } = getCredentials();
  const basicToken = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  return {
    Authorization: `Basic ${basicToken}`,
    "Content-Type": "application/json",
  };
}

async function razorpayRequest(path: string, init: RequestInit) {
  const response = await fetch(`${RAZORPAY_API_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers || {}) },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const code =
      typeof body?.error?.code === "string" ? body.error.code : undefined;

    logRequestFailure(response.status, code);

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Razorpay authentication failed. Update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Railway, then redeploy the service.",
      );
    }

    throw new Error(
      body?.error?.description ||
        "Razorpay could not process this payment. Please try again.",
    );
  }

  return body;
}

export function getRazorpayPublicConfig() {
  return { keyId: getCredentials().keyId };
}

export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}) {
  return razorpayRequest("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
    }),
  });
}

export async function fetchRazorpayPayment(paymentId: string) {
  return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
  });
}

export async function captureRazorpayPayment(
  paymentId: string,
  amountPaise: number,
) {
  return razorpayRequest(
    `/payments/${encodeURIComponent(paymentId)}/capture`,
    {
      method: "POST",
      body: JSON.stringify({ amount: amountPaise, currency: "INR" }),
    },
  );
}

export function verifyRazorpaySignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const { keySecret } = getCredentials();

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");

  const expected = Buffer.from(expectedSignature, "utf8");
  const received = Buffer.from(input.razorpaySignature, "utf8");

  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}
