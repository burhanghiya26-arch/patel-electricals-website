// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>)

import { ENV } from './_core/env';

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig | null {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  // Return null if not configured
  if (!baseUrl || !apiKey || baseUrl === "https://api.manus.im" || apiKey === "default-key") {
    console.log("[Storage] Service not configured");
    return null;
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  
  // Return dummy response if storage is not configured
  if (!config) {
    console.log("[Storage] Upload skipped - service not configured");
    return { 
      key: relKey, 
      url: `data:${contentType};base64,${Buffer.isBuffer(data) ? data.toString('base64') : Buffer.from(data).toString('base64')}` 
    };
  }

  try {
    const { baseUrl, apiKey } = config;
    const key = normalizeKey(relKey);
    const uploadUrl = buildUploadUrl(baseUrl, key);
    const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: buildAuthHeaders(apiKey),
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new Error(
        `Storage upload failed (${response.status} ${response.statusText}): ${message}`
      );
    }
    const url = (await response.json()).url;
    return { key, url };
  } catch (error) {
    console.error("[Storage] Upload error:", error);
    // Return data URL as fallback
    return { 
      key: relKey, 
      url: `data:${contentType};base64,${Buffer.isBuffer(data) ? data.toString('base64') : Buffer.from(data).toString('base64')}` 
    };
  }
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const config = getStorageConfig();
  
  // Return dummy response if storage is not configured
  if (!config) {
    console.log("[Storage] Get skipped - service not configured");
    return {
      key: relKey,
      url: "",
    };
  }

  try {
    const { baseUrl, apiKey } = config;
    const key = normalizeKey(relKey);
    return {
      key,
      url: await buildDownloadUrl(baseUrl, key, apiKey),
    };
  } catch (error) {
    console.error("[Storage] Get error:", error);
    return {
      key: relKey,
      url: "",
    };
  }
}
