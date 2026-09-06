const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external";

type ShiprocketCourier = {
  courier_name?: string;
  courier_company_id?: number;
  rate?: number | string;
  freight_charge?: number | string;
  total_charge?: number | string;
  etd?: string;
};

type TokenCache = { token: string; expiresAt: number } | null;
let tokenCache: TokenCache = null;

function configuredValue(name: "SHIPROCKET_API_EMAIL" | "SHIPROCKET_API_PASSWORD" | "SHIPROCKET_PICKUP_PINCODE") {
  return process.env[name]?.trim() || "";
}

export function isShiprocketConfigured() {
  return Boolean(
    configuredValue("SHIPROCKET_API_EMAIL") &&
      configuredValue("SHIPROCKET_API_PASSWORD") &&
      configuredValue("SHIPROCKET_PICKUP_PINCODE"),
  );
}

async function getAuthToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;

  const email = configuredValue("SHIPROCKET_API_EMAIL");
  const password = configuredValue("SHIPROCKET_API_PASSWORD");
  if (!email || !password) throw new Error("Shiprocket API credentials are not configured.");

  const response = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body?.token !== "string") {
    console.error("[Shiprocket] Authentication failed", response.status, body?.message || body?.error);
    throw new Error("Shiprocket authentication failed. Check API settings in Railway.");
  }

  // Shiprocket tokens are short-lived. Refresh before the stated expiry so a
  // customer never receives a quote using a stale token.
  tokenCache = { token: body.token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 };
  return body.token;
}

function chargeForCourier(courier: ShiprocketCourier): number | null {
  const candidates = [courier.rate, courier.total_charge, courier.freight_charge];
  for (const candidate of candidates) {
    const amount = Number(candidate);
    if (Number.isFinite(amount) && amount >= 0) return amount;
  }
  return null;
}

export async function getShiprocketShippingQuote(input: {
  deliveryPincode: string;
  weightKg: number;
  cod: boolean;
}): Promise<{
  available: boolean;
  shippingCost: number;
  courierName?: string;
  courierId?: number;
  estimatedDelivery?: string;
  message?: string;
}> {
  if (!isShiprocketConfigured()) {
    return {
      available: false,
      shippingCost: 0,
      message: "All-India shipping is being set up. Please try again shortly.",
    };
  }

  const token = await getAuthToken();
  const params = new URLSearchParams({
    pickup_postcode: configuredValue("SHIPROCKET_PICKUP_PINCODE"),
    delivery_postcode: input.deliveryPincode,
    weight: String(Math.max(0.1, Number(input.weightKg.toFixed(3)))),
    cod: input.cod ? "1" : "0",
  });
  const response = await fetch(`${SHIPROCKET_BASE_URL}/courier/serviceability/?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[Shiprocket] Serviceability check failed", response.status, body?.message || body?.error);
    return {
      available: false,
      shippingCost: 0,
      message: body?.message || "This pincode is not serviceable by our courier partners.",
    };
  }

  const couriers: ShiprocketCourier[] = Array.isArray(body?.data?.available_courier_companies)
    ? body.data.available_courier_companies
    : [];
  const options = couriers
    .map(courier => ({ courier, charge: chargeForCourier(courier) }))
    .filter((option): option is { courier: ShiprocketCourier; charge: number } => option.charge !== null)
    .sort((a, b) => a.charge - b.charge);

  if (options.length === 0) {
    return {
      available: false,
      shippingCost: 0,
      message: "This pincode is not serviceable for COD delivery.",
    };
  }

  const best = options[0];
  return {
    available: true,
    shippingCost: Math.ceil(best.charge),
    courierName: best.courier.courier_name,
    courierId: best.courier.courier_company_id,
    estimatedDelivery: best.courier.etd,
  };
}
