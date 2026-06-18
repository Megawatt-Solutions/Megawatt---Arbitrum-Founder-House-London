// Lightweight inline-SVG icon set (stroke = currentColor) so we don't pull
// in an icon dependency. Each takes an optional size.
import type { CSSProperties } from "react";

interface IconProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

function svg(path: React.ReactNode, fill = false) {
  return function Icon({ size = 18, className, style }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fill ? "currentColor" : "none"}
        stroke={fill ? "none" : "currentColor"}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
        aria-hidden
      >
        {path}
      </svg>
    );
  };
}

export const BoltIcon = svg(<path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />, true);
export const BatteryIcon = svg(
  <>
    <rect x="3" y="8" width="15" height="9" rx="2" />
    <path d="M21 11v3" />
    <rect x="5.5" y="10.5" width="7" height="4" rx="1" fill="currentColor" stroke="none" />
  </>
);
export const LayersIcon = svg(
  <>
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="M3 13l9 5 9-5" />
    <path d="M3 17.5 12 22l9-4.5" opacity="0.5" />
  </>
);
export const ShieldIcon = svg(
  <>
    <path d="M12 3 5 6v5c0 4 3 7 7 8 4-1 7-4 7-8V6l-7-3Z" />
    <path d="m9.5 11.5 1.8 1.8 3.2-3.6" />
  </>
);
export const WalletIcon = svg(
  <>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1H5.5" />
    <path d="M20 8H5.5A2.5 2.5 0 0 0 3 10.5V17a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1Z" />
    <circle cx="16.5" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
  </>
);
export const GridIcon = svg(
  <>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </>
);
export const BriefcaseIcon = svg(
  <>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
    <path d="M3 12h18" />
  </>
);
export const StoreIcon = svg(
  <>
    <path d="M4 9.5 5 4h14l1 5.5a2.5 2.5 0 0 1-5 .3 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5-.3Z" />
    <path d="M5 11v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
  </>
);
export const ArrowLeftIcon = svg(<path d="M14 6l-6 6 6 6" />);
export const ChevronDownIcon = svg(<path d="m6 9 6 6 6-6" />);
export const ChevronRightIcon = svg(<path d="m9 6 6 6-6 6" />);
export const ClockIcon = svg(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8v4.2l2.8 1.8" />
  </>
);
export const PlusIcon = svg(<path d="M12 5v14M5 12h14" />);
export const CheckIcon = svg(<path d="m5 12 4.5 4.5L19 7" />);
export const TrendingUpIcon = svg(<path d="m4 16 5-5 3.5 3.5L20 7m0 0h-4.5M20 7v4.5" />);
export const SunIcon = svg(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.5 4.5l1.4 1.4M18 18l1.5 1.5M2 12h2M20 12h2M4.5 19.5 6 18M18 6l1.5-1.5" />
  </>
);
export const ArrowDownIcon = svg(<path d="M12 5v14M6 13l6 6 6-6" />);
export const ArrowUpIcon = svg(<path d="M12 19V5M6 11l6-6 6 6" />);
export const ExternalLinkIcon = svg(
  <>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </>
);
export const CopyIcon = svg(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </>
);
export const XIcon = svg(<path d="M6 6l12 12M18 6 6 18" />);
export const CoinsIcon = svg(
  <>
    <ellipse cx="9" cy="7" rx="6" ry="3" />
    <path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3" />
    <path d="M9 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
    <ellipse cx="15" cy="12" rx="6" ry="3" />
  </>
);
export const CubeIcon = svg(
  <>
    <path d="M12 2.5 21 7v10l-9 4.5L3 17V7l9-4.5Z" />
    <path d="M3 7l9 4.5L21 7M12 11.5V21.5" />
  </>
);
export const VerifiedIcon = svg(
  <>
    <path d="m12 2.5 2.4 1.7 2.9-.2 1 2.8 2.4 1.6-.8 2.8.8 2.8-2.4 1.6-1 2.8-2.9-.2L12 21.5l-2.4-1.7-2.9.2-1-2.8-2.4-1.6.8-2.8-.8-2.8 2.4-1.6 1-2.8 2.9.2L12 2.5Z" />
    <path d="m9 12 2 2 4-4" />
  </>
);
