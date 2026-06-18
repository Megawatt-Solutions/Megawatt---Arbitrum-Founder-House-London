import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/lib/wallet";
import { TopNav } from "@/components/TopNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Megawatt — BESS Vaults",
  description:
    "Invest in Battery Energy Storage Systems, earn yield, and trade your position — on the XRPL EVM Sidechain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      
      <body suppressHydrationWarning>
        <AppProviders>
          <TopNav />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
