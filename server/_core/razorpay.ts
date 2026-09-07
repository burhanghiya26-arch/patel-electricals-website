import crypto from "crypto";

const RAZORPAY_API_URL = "https://api.razorpay.com/v1";

function getCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || "";
  if (!keyId || !keySecret) {
    throw new Error("Online payments are not configured yet.");
  }
  return { keyId, keySecret };
}

function authHeaders() {
  const { keyId, keySecret } = getCredentials();
  const basicToken = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return { Authorization: `Basic ${basicToken}`, "Content-Type": "application/json" };
}

async function razorpayRequest(path: string, init: RequestInit) {
  const response = await fetch(`${RAZORPAY_API_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[Razorpay] API request failed", response.status, body?.error?.description || body?.error);
    throw new Error(body?.error?.description || "Razorpay could not process this payment. Please try again.");
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
  return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`, { method: "GET" });
}

export async function captureRazorpayPayment(paymentId: string, amountPaise: number) {
  return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}/capture`, {
    method: "POST",
    body: JSON.stringify({ amount: amountPaise, currency: "INR" }),
  });
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
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
