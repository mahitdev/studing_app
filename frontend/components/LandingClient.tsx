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

  useEffect(() => {
    const magnets = Array.from(document.querySelectorAll<HTMLElement>(".magnetic"));
    const onMagMove = (event: MouseEvent) => {
      const el = event.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
      el.style.setProperty("--mag-x", `${x.toFixed(2)}px`);
      el.style.setProperty("--mag-y", `${y.toFixed(2)}px`);
    };
    const onMagLeave = (event: MouseEvent) => {
      const el = event.currentTarget as HTMLElement;
      el.style.setProperty("--mag-x", "0px");
      el.style.setProperty("--mag-y", "0px");
    };

    const onRipple = (event: MouseEvent) => {
      const target = event.currentTarget as HTMLElement;
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      const rect = target.getBoundingClientRect();
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      target.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 500);
    };

    magnets.forEach((el) => {
      el.addEventListener("mousemove", onMagMove);
      el.addEventListener("mouseleave", onMagLeave);
      el.addEventListener("click", onRipple);
    });

    return () => {
      magnets.forEach((el) => {
        el.removeEventListener("mousemove", onMagMove);
        el.removeEventListener("mouseleave", onMagLeave);
        el.removeEventListener("click", onRipple);
      });
    };
  }, []);

  useEffect(() => {
    const counters = Array.from(document.querySelectorAll<HTMLElement>(".countup"));
    counters.forEach((node) => {
      const target = Number(node.dataset.target || "0");
      let frame = 0;
      const maxFrames = 38;
      const tick = () => {
        frame += 1;
        const val = Math.round((target * frame) / maxFrames);
        node.textContent = `${val}%`;
        if (frame < maxFrames) window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    });
  }, []);

  return (
    <button type="button" className="ghost" onClick={() => setDark((v) => !v)}>
      {dark ? "Light" : "Dark"} mode
    </button>
  );
}
