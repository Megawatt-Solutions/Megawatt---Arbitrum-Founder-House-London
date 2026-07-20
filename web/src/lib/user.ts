/** KYC presentation labels. Verification will be issued as XRPL
 * Credentials (XLS-70) once the compliance flow goes live. */
export const KYC_LABEL: Record<0 | 1 | 2, string> = {
  0: "Not verified",
  1: "KYC Verified",
  2: "Accredited Investor",
};
