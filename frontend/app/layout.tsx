import type { Metadata } from "next";
import { Manrope, Orbitron } from "next/font/google";
import "./globals.css";

const bodyFont = Manrope({ subsets: ["latin"], variable: "--font-body" });
const displayFont = Orbitron({ subsets: ["latin"], variable: "--font-display", weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "GrindLock | The Ultimate Productivity OS for Students",
  description: "Master your focus with GrindLock's brutal accountability system. 3D timers, deep analytics, and social pressure to keep you grinding.",
  keywords: ["productivity", "study tracker", "focus timer", "pomodoro", "analytics", "student tools", "GrindLock"],
  authors: [{ name: "GrindLock Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
