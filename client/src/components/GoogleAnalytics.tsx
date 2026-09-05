import { useEffect } from "react";
import { useLocation } from "wouter";
import { GA_MEASUREMENT_ID, trackEvent } from "@/lib/analytics";

export default function GoogleAnalytics() {
  const [location] = useLocation();

  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args));
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });

    if (!document.querySelector(`script[data-ga-id="${GA_MEASUREMENT_ID}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      script.dataset.gaId = GA_MEASUREMENT_ID;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    trackEvent("page_view", {
      page_location: window.location.href,
      page_path: location,
      page_title: document.title,
    });
  }, [location]);

  return null;
}
