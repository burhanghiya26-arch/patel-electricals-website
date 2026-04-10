/**
 * Image generation helper using internal ImageService
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 *
 * For editing:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "Add a rainbow to this landscape",
 *     originalImages: [{
 *       url: "https://example.com/original.jpg",
 *       mimeType: "image/jpeg"
 *     }]
 *   });
 */
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  // Return empty response if service is not configured
  if (!ENV.forgeApiUrl || ENV.forgeApiUrl === "https://api.manus.im") {
    console.log("[ImageGeneration] Service not configured, returning empty response");
    return {};
  }
  if (!ENV.forgeApiKey || ENV.forgeApiKey === "default-key") {
    console.log("[ImageGeneration] API key not configured, returning empty response");
    return {};
  }

  try {
    // Build the full URL by appending the service path to the base URL
    const baseUrl = ENV.forgeApiUrl.endsWith("/")
      ? ENV.forgeApiUrl
      : `${ENV.forgeApiUrl}/`;
    const fullUrl = new URL(
      "images.v1.ImageService/GenerateImage",
      baseUrl
    ).toString();

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "connect-protocol-version": "1",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        prompt: options.prompt,
        original_images: options.originalImages || [],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[ImageGeneration] Request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return {};
    }

    const result = (await response.json()) as {
      image: {
        b64Json: string;
        mimeType: string;
      };
    };
    const base64Data = result.image.b64Json;
    const buffer = Buffer.from(base64Data, "base64");

    // Save to S3
    const { storagePut } = await import("server/storage");
    const { url } = await storagePut(
      `generated/${Date.now()}.png`,
      buffer,
      result.image.mimeType
    );
    return {
      url,
    };
  } catch (error) {
    console.error("[ImageGeneration] Error:", error);
    return {};
  }
}
