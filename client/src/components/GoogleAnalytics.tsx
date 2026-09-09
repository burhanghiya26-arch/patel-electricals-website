import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";

export default function GoogleAnalytics() {
  const [location] = useLocation();
  const [isReady, setIsReady] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    window.dataLayer = window.dataLayer || [];

    if (!window.gtag) {
      window.gtag = function () {
        window.dataLayer?.push(arguments);
      } as (...args: unknown[]) => void;
    }

    const initializeAnalytics = () => {
      if (initialized.current || !window.gtag) return;

      initialized.current = true;
      window.gtag("js", new Date());
      window.gtag("config", GA_MEASUREMENT_ID, {
        send_page_view: false,
      });

      setIsReady(true);
    };

    const existingScript = document.querySelector(
      `script[data-ga-id="${GA_MEASUREMENT_ID}"]`,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", initializeAnalytics, {
        once: true,
      });

      if (existingScript.dataset.loaded === "true") {
        initializeAnalytics();
      }

      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.dataset.gaId = GA_MEASUREMENT_ID;

    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        initializeAnalytics();
      },
      { once: true },
    );

    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isReady || !window.gtag) return;

    window.gtag("event", "page_view", {
      page_location: window.location.href,
      page_path: location,
      page_title: document.title,
    });
  }, [isReady, location]);

  return null;
}
