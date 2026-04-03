import type { Metadata } from "next";
import { Space_Grotesk, Bebas_Neue } from "next/font/google";
import "./globals.css";

const bodyFont = Space_Grotesk({ subsets: ["latin"], variable: "--font-body" });
const displayFont = Bebas_Neue({ subsets: ["latin"], variable: "--font-display", weight: "400" });

export const metadata: Metadata = {
  title: "Study Tracker | Discipline Mode",
  description: "Brutal accountability tracker for focused students"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}