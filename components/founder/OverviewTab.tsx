"use client";

import { useEffect, useState } from "react";
import { AUDIT_LABEL } from "@/lib/constants";
import { call, formatDate } from "./api";
import { ErrorNote, Loading, Panel } from "./FounderConsole";

type Overview = {
  stats: {
    clubs: number;
    founders: number;
    coaches: number;
    players: number;
    reflections: number;
    weekReflections: number;
    openFlags: number;
    escalations: number;
    openInvites: number;
  };
  aiDemoMode: boolean;
  recentAudit: {
    id: string;
    action: string;
    actorEmail: string;
    reason: string | null;
    createdAt: string;
  }[];
};

export function OverviewTab({ onJump }: { onJump: (tab: "flags" | "invites" | "audit") => void }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    call<Overview>("/api/founder/overview").then((result) =>
      result.ok ? setData(result.data) : setError(result.error),
    );
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Loading />;

  const { stats } = data;

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat value={stats.clubs} label="Klubbar" />
        <Stat value={stats.players} label="Spelare" />
        <Stat value={stats.coaches} label="Tränare" />
        <Stat value={stats.reflections} label="Reflektioner totalt" />
        <Stat value={stats.weekReflections} label="Senaste 7 dagarna" />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button type="button" onClick={() => onJump("flags")} className="mm-stat-card text-left">
          <div
            className={`font-display font-mono text-[34px] leading-none ${
              stats.escalations > 0 ? "text-clay" : "text-court-dark"
            }`}
          >
            {stats.openFlags}
          </div>
          <div className="mm-label mt-[7px]">
            Öppna flaggor{stats.escalations > 0 ? ` · ${stats.escalations} eskalering` : ""}
          </div>
        </button>
        <button type="button" onClick={() => onJump("invites")} className="mm-stat-card text-left">
          <div className="font-display text-court-dark font-mono text-[34px] leading-none">
            {stats.openInvites}
          </div>
          <div className="mm-label mt-[7px]">Öppna inbjudningar</div>
        </button>
        <div className="mm-stat-card">
          <div className="font-display text-court-dark text-[20px] leading-tight">
            {data.aiDemoMode ? "Demoläge" : "Skarp AI"}
          </div>
          <div className="mm-label mt-[7px]">
            {data.aiDemoMode ? "Ingen API-nyckel satt" : "Anthropic-nyckel aktiv"}
          </div>
        </div>
      </div>

      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[18px]">Senaste händelser</h2>
          <button
            type="button"
            onClick={() => onJump("audit")}
            className="text-brass text-[12px] underline"
          >
            Hela loggen
          </button>
        </div>
        {data.recentAudit.length === 0 ? (
          <p className="text-ink-soft text-[13px] italic">Inget loggat ännu.</p>
        ) : (
          <ul className="flex flex-col">
            {data.recentAudit.map((entry) => (
              <li
                key={entry.id}
                className="border-line flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b py-2.5 text-[12.5px] last:border-b-0"
              >
                <span className="text-brass w-[110px] shrink-0 font-mono text-[11px]">
                  {formatDate(entry.createdAt)}
                </span>
                <span className="font-semibold">{AUDIT_LABEL[entry.action] ?? entry.action}</span>
                <span className="text-ink-soft">{entry.actorEmail}</span>
                {entry.reason ? (
                  <span className="text-ink-soft italic">”{entry.reason}”</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="mm-stat-card">
      <div className="font-display text-court-dark font-mono text-[34px] leading-none">{value}</div>
      <div className="mm-label mt-[7px]">{label}</div>
    </div>
  );
}
