interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}

export function Sparkline({ data, width = 76, height = 28, color = "var(--accent)", fill = true }: Props) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const pt = (v: number, i: number) => {
    const x = (i / (data.length - 1)) * width;
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  };
  const line = data.map((v, i) => pt(v, i).join(",")).join(" ");
  const area = `${line} ${width},${height} 0,${height}`;
  const id = `sl-${Math.round(data[0] * 100)}-${data.length}`;
  return (
    <svg width={width} height={height} style={{ display: "block" }} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <polygon points={area} fill={`url(#${id})`} />}
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
