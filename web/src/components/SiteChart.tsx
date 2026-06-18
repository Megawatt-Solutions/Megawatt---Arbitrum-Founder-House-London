"use client";
import { useMemo, useState } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend,
} from "chart.js";
import type { ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import type { Vault } from "@/lib/types";
import { getSeries } from "@/lib/telemetry";
import type { SeriesRange } from "@/lib/telemetry";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const RANGES: { key: SeriesRange; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];
const INTERVAL_HOURS: Record<SeriesRange, number> = { day: 0.25, week: 3, month: 12, year: 168 };

export function SiteChart({ vault }: { vault: Vault }) {
  const [range, setRange] = useState<SeriesRange>("day");
  const [mode, setMode] = useState<"power" | "energy">("power");
  const series = useMemo(() => getSeries(vault, range), [vault, range]);
  const hasSolar = vault.spec.hasSolar;

  const k = mode === "energy" ? INTERVAL_HOURS[range] : 1;
  const unit = mode === "energy" ? "kWh" : "kW";

  const data = {
    labels: series.map((p) => p.t),
    datasets: [
      ...(hasSolar
        ? [{
            label: "Solar", yAxisID: "y", data: series.map((p) => p.solarKw * k),
            borderColor: "#f4b53e", backgroundColor: "rgba(244,181,62,0.22)", fill: "origin",
            tension: 0.35, pointRadius: 0, borderWidth: 1.4,
          }]
        : []),
      {
        label: "Grid", yAxisID: "y", data: series.map((p) => p.gridKw * k),
        borderColor: "#6b8cff", backgroundColor: "rgba(107,140,255,0.14)", fill: "origin",
        tension: 0.35, pointRadius: 0, borderWidth: 1.2,
      },
      {
        label: "Consumption", yAxisID: "y", data: series.map((p) => -p.consumptionKw * k),
        borderColor: "#34d399", backgroundColor: "rgba(52,211,153,0.2)", fill: "origin",
        tension: 0.35, pointRadius: 0, borderWidth: 1.2,
      },
      {
        label: "Battery", yAxisID: "y", data: series.map((p) => p.batteryKw * k),
        borderColor: "#2dd4bf", backgroundColor: "transparent", fill: false,
        tension: 0.35, pointRadius: 0, borderWidth: 1.4,
      },
      {
        label: "SoC", yAxisID: "y1", data: series.map((p) => p.socPct),
        borderColor: "#8fb3ff", backgroundColor: "transparent", fill: false,
        tension: 0.4, pointRadius: 0, borderWidth: 2, borderDash: [4, 3],
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: true, position: "top", align: "end", labels: { color: "#aab2ae", boxWidth: 8, boxHeight: 8, usePointStyle: true, font: { size: 11.5 } } },
      tooltip: {
        backgroundColor: "#1c2220", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1, padding: 10,
        titleColor: "#f1f4f2", bodyColor: "#aab2ae",
        callbacks: {
          label: (ctx) => {
            const u = ctx.dataset.yAxisID === "y1" ? "%" : unit;
            return ` ${ctx.dataset.label}: ${Math.round((ctx.parsed.y ?? 0) * 10) / 10} ${u}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#6c756f", font: { size: 10.5 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }, border: { display: false } },
      y: {
        position: "left", grid: { color: "rgba(255,255,255,0.05)" },
        ticks: { color: "#6c756f", font: { size: 10.5 }, callback: (v) => `${v} ${unit}` }, border: { display: false },
      },
      y1: {
        position: "right", min: 0, max: 100, grid: { display: false },
        ticks: { color: "#5a7", font: { size: 10.5 }, callback: (v) => `${v}%` }, border: { display: false },
        title: { display: true, text: "SoC", color: "#5a7", font: { size: 11 } },
      },
    },
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div className="seg">
          {RANGES.map((r) => (
            <button key={r.key} className={`seg-btn ${range === r.key ? "active" : ""}`} onClick={() => setRange(r.key)}>{r.label}</button>
          ))}
        </div>
        <div className="seg">
          <button className={`seg-btn ${mode === "power" ? "active" : ""}`} onClick={() => setMode("power")}>Power</button>
          <button className={`seg-btn ${mode === "energy" ? "active" : ""}`} onClick={() => setMode("energy")}>Energy</button>
        </div>
      </div>
      <div style={{ height: 320 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
