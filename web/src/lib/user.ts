import type { UserProfile } from "./types";
import { DEPLOYER } from "./vaults";

/** The connected user (the testnet deployer in the product screenshot). */
export const CURRENT_USER: UserProfile = {
  address: DEPLOYER,
  kycLevel: 2, // accredited investor
  kycIssuer: "Megawatt Compliance (XLS-70)",
  kycIssuedAt: "2025-10-02",
  usdcBalance: 100044.34,
};

export const KYC_LABEL: Record<0 | 1 | 2, string> = {
  0: "Not verified",
  1: "KYC Verified",
  2: "Accredited Investor",
};
