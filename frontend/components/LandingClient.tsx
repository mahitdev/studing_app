"use client";

import { useEffect, useState } from "react";

export default function LandingClient() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.body.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  return (
    <button type="button" className="ghost" onClick={() => setDark((v) => !v)}>
      {dark ? "Light" : "Dark"} mode
    </button>
  );
}
