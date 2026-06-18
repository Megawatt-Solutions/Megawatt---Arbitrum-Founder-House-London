import { notFound } from "next/navigation";
import { getVault, VAULTS } from "@/lib/vaults";
import { VaultDetail } from "@/components/VaultDetail";

export function generateStaticParams() {
  return VAULTS.map((v) => ({ id: v.id }));
}

export default async function VaultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vault = getVault(id);
  if (!vault) notFound();
  return <VaultDetail vault={vault} />;
}
