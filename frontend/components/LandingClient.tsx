"use client";

import { useEffect, useState } from "react";

export default function LandingClient() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.body.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

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
      { threshold: 0.2 }
    );

    revealNodes.forEach((node) => io.observe(node));

    const onMove = (event: MouseEvent) => {
      const px = ((event.clientX / window.innerWidth) - 0.5) * 2;
      const py = ((event.clientY / window.innerHeight) - 0.5) * 2;
      document.documentElement.style.setProperty("--parallax-x", `${px.toFixed(4)}`);
      document.documentElement.style.setProperty("--parallax-y", `${py.toFixed(4)}`);
    };

    window.addEventListener("mousemove", onMove);
    return () => {
      io.disconnect();
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <button type="button" className="ghost" onClick={() => setDark((v) => !v)}>
      {dark ? "Light" : "Dark"} mode
    </button>
  );
}
