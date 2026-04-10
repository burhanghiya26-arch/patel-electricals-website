/**
 * Quick example (matches curl usage):
 *   await callDataApi("Youtube/search", {
 *     query: { gl: "US", hl: "en", q: "manus" },
 *   })
 */
import { ENV } from "./env";

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

export async function callDataApi(
  apiId: string,
  options: DataApiCallOptions = {}
): Promise<unknown> {
  // Return null if service is not configured
  if (!ENV.forgeApiUrl || ENV.forgeApiUrl === "https://api.manus.im") {
    console.log("[DataApi] Service not configured, returning null");
    return null;
  }
  if (!ENV.forgeApiKey || ENV.forgeApiKey === "default-key") {
    console.log("[DataApi] API key not configured, returning null");
    return null;
  }

  try {
    // Build the full URL by appending the service path to the base URL
    const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
    const fullUrl = new URL("webdevtoken.v1.WebDevService/CallApi", baseUrl).toString();

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "connect-protocol-version": "1",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        apiId,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("[DataApi] Error calling data API:", error);
    return null;
  }
}
