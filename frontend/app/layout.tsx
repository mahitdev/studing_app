import type { Metadata } from "next";
import { Manrope, Orbitron } from "next/font/google";
import "./globals.css";

const bodyFont = Manrope({ subsets: ["latin"], variable: "--font-body" });
const displayFont = Orbitron({ subsets: ["latin"], variable: "--font-display", weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "GrindLock | Discipline Mode",
  description: "GrindLock is a discipline-first productivity tracker for focused students"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
