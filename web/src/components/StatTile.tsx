import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  valueClass?: string;
  small?: boolean;
}

export function StatTile({ label, value, sub, icon, valueClass, small }: Props) {
  return (
    <div className="tile">
      {icon && <span className="tile-icon">{icon}</span>}
      <div className="caps">{label}</div>
      <div className={`tile-value num ${small ? "sm" : ""} ${valueClass ?? ""}`}>{value}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  );
}
