"use client";

import { useEffect } from "react";

export default function LandingClient() {
  useEffect(() => {
    const revealNodes = Array.from(document.querySelectorAll(".reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      { threshold: 0.1 }
    );

    revealNodes.forEach((node) => io.observe(node));

    return () => io.disconnect();
  }, []);

  return null;
}