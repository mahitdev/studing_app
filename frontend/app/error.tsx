"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if present
    console.error("Application Render Error:", error);
  }, [error]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "2rem",
      textAlign: "center",
      backgroundColor: "var(--bg-document, #0d0d12)",
      color: "var(--fg-base, #ffffff)",
      fontFamily: "var(--font-primary, sans-serif)"
    }}>
      <h2 style={{ fontSize: "2rem", marginBottom: "1rem", color: "#FF617A" }}>
        System Offline
      </h2>
      <p style={{
        color: "var(--fg-muted, #a1a1aa)",
        marginBottom: "2.5rem",
        maxWidth: "400px",
        lineHeight: "1.6"
      }}>
        A critical UI error was encountered while generating this view. Our data tracking engines have suspended to prevent data corruption.
      </p>
      <button 
        onClick={() => reset()} 
        style={{
          padding: "0.75rem 1.75rem",
          borderRadius: "8px",
          border: "none",
          backgroundColor: "var(--accent-primary, #7B61FF)",
          color: "#ffffff",
          fontWeight: "600",
          fontSize: "1rem",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(123, 97, 255, 0.3)",
          transition: "transform 0.2s ease"
        }}>
        Re-initialize System
      </button>
    </div>
  );
}
