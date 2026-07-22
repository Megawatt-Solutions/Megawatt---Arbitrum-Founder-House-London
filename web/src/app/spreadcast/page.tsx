"use client";
// Spreadcast — the free daily forecasting game on the SI day-ahead market,
// embedded as a page of the Megawatt app. One container, four views,
// switched by the centered tab menu below (no separate routes).

import { useState } from "react";
import { PlayView } from "@/components/spreadcast/PlayView";
import { LeaderboardView } from "@/components/spreadcast/LeaderboardView";
import { ArchiveView } from "@/components/spreadcast/ArchiveView";
import { HowView } from "@/components/spreadcast/HowView";

const TABS = [
  { id: "play", label: "Play" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "archive", label: "Results" },
  { id: "how", label: "How it works" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SpreadcastPage() {
  const [tab, setTab] = useState<TabId>("play");

  return (
    <main className="page sc">
      <div className="sc-tabs" role="tablist" aria-label="Spreadcast">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`sc-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "play" && <PlayView />}
      {tab === "leaderboard" && <LeaderboardView />}
      {tab === "archive" && <ArchiveView />}
      {tab === "how" && <HowView />}

      <p className="sc-legal">
        FREE SKILL-BASED PROMOTIONAL COMPETITION · 18+ · NO PURCHASE NECESSARY · PRIZES ARE PROMOTIONAL AWARDS
      </p>
    </main>
  );
}
