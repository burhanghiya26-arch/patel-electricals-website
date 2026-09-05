export const GA_MEASUREMENT_ID = "G-0W957Z5PQN";

type AnalyticsParameters = Record<string, string | number | boolean | undefined | unknown[]>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(eventName: string, parameters: AnalyticsParameters = {}) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, parameters);
}
