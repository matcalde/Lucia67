"use client";

import { useEffect } from "react";

export default function SmoothScroll() {
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "smooth";

    // If the page loads with a hash, ensure the browser scrolls with our offset-aware targets
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        // Trigger after paint to allow layout
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }

    return () => {
      root.style.scrollBehavior = prev || "";
    };
  }, []);

  return null;
}