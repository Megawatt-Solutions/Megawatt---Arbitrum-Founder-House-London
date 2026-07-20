// Megawatt double-bolt "MW" logomark — official brand path, copied from
// web/src/components/BrandMark.tsx so the game carries the same brand.
const MARK_PATH =
  "M201.884 126.65V294.189L298.625 169.445L309.023 228.462L443.896 0.00012207L319.82 122.755L317.765 87.6609L242.013 167.539V0.00012207L145.272 124.744L134.874 65.7276L0.000213623 294.189L124.076 171.435L126.132 206.529L201.884 126.65Z";

export function BrandMark({ height = 16, color = "currentColor" }: { height?: number; color?: string }) {
  const width = Math.round(height * (444 / 295));
  return (
    <svg width={width} height={height} viewBox="0 0 444 295" fill="none" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d={MARK_PATH} fill={color} />
    </svg>
  );
}
