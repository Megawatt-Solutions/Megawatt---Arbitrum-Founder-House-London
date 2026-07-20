import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spreadcast — the daily electricity forecasting game",
  description:
    "Free daily forecasting game on the Slovenian day-ahead electricity market. Predict tomorrow's price spread band, build streaks, climb the leaderboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <header className="nav">
          <Link href="/" className="nav-brand">
            <BrandMark height={15} color="var(--accent)" />
            SPREADCAST
          </Link>
          <span className="nav-zone">SI · DAY-AHEAD</span>
          <nav className="nav-links">
            <Link href="/" className="nav-link">
              PLAY
            </Link>
            <Link href="/leaderboard" className="nav-link">
              LEADERBOARD
            </Link>
            <Link href="/archive" className="nav-link">
              ARCHIVE
            </Link>
            <Link href="/how" className="nav-link">
              HOW IT WORKS
            </Link>
          </nav>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-foot">
          <span>FREE SKILL-BASED PROMOTIONAL COMPETITION · 18+ · NO PURCHASE NECESSARY · PRIZES ARE PROMOTIONAL AWARDS</span>
          <span className="foot-credit">
            <BrandMark height={10} color="var(--muted)" /> POWERED BY MEGAWATT
          </span>
        </footer>
      </body>
    </html>
  );
}
