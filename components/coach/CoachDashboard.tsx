"use client";

import { useState } from "react";
import type { ClubStats, PlayerSummary, WeeklyDigest } from "@/lib/players";
import { Sparkline } from "./Sparkline";
import { PlayerPanel } from "./PlayerPanel";
import { CoachFlags } from "./CoachFlags";
import { InvitePlayerCard } from "./InvitePlayerCard";
import { avatarColor, initials } from "./avatar";

export function CoachDashboard({
  coachName,
  players,
  stats,
  digest,
  teamPlan,
}: {
  coachName: string;
  players: PlayerSummary[];
  stats: ClubStats;
  digest: WeeklyDigest;
  teamPlan: string;
}) {
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);

  return (
    <>
      <div className="mb-5">
        <h1 className="font-display text-[26px] leading-tight">Hej {coachName.split(" ")[0]}</h1>
        <p className="font-display text-ink-soft text-[14.5px] italic">
          Truppens läge just nu — sammanställt, aldrig spelarnas råa reflektionstext.
        </p>
      </div>

      <WeeklyDigestCard digest={digest} />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard value={stats.playerCount} label="Aktiva spelare" />
        <StatCard value={stats.reflectionsThisPeriod} label="Reflektioner, denna period" />
        <StatCard value={stats.averageMood.toFixed(1)} label="Snitt mående (1–5)" />
        <StatCard value={stats.flaggedCount} label="Flaggade, uppföljning" tone="alert" />
        <StatCard value={stats.dropoutRiskCount} label="Risk för avhopp" tone="warn" />
      </div>

      <CoachFlags />

      <TeamPlanCard initialText={teamPlan} />

      <InvitePlayerCard />

      <h2 className="mm-section-title mb-3.5">
        Truppen{" "}
        <span className="text-ink-soft text-[12px] font-normal">
          sorterad efter behov av uppmärksamhet
        </span>
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((player) => (
          <PlayerCard key={player.id} player={player} onOpen={() => setOpenPlayerId(player.id)} />
        ))}
      </div>

      {openPlayerId ? (
        <PlayerPanel key={openPlayerId} playerId={openPlayerId} onClose={() => setOpenPlayerId(null)} />
      ) : null}
    </>
  );
}

function StatCard({
  value,
  label,
  tone,
}: {
  value: number | string;
  label: string;
  tone?: "alert" | "warn";
}) {
  const color =
    tone === "alert" ? "text-clay" : tone === "warn" ? "text-amber-dark" : "text-court-dark";
  return (
    <div className="mm-stat-card">
      <div className={`font-mono font-display text-[34px] leading-none ${color}`}>{value}</div>
      <div className="mm-label mt-[7px]">{label}</div>
    </div>
  );
}

function WeeklyDigestCard({ digest }: { digest: WeeklyDigest }) {
  const [open, setOpen] = useState(false);
  const list = (names: string[]) => (names.length ? `: ${names.join(", ")}` : "");

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="border-line hover:border-brass flex w-full items-center justify-between gap-3 rounded-[10px] border border-l-[3px] border-l-[var(--brass)] bg-[var(--white)] px-4.5 py-3 text-left transition"
      >
        <span className="font-display text-[17px]">Veckans sammanfattning</span>
        <span className="text-ink-soft font-mono text-[11px]">
          {open ? "dölj ▴" : "visa ▾"}
        </span>
      </button>

      {open ? (
        <div className="border-line mt-2 rounded-[10px] border border-l-[3px] border-l-[var(--brass)] bg-[var(--white)] px-5 py-4.5">
          <DigestRow icon="📈">
            <b>{digest.improving.length} spelare</b> visar tydlig förbättring
            {list(digest.improving)}.
          </DigestRow>
          <DigestRow icon="🎯">
            <b>{digest.flagged.length} flaggade</b> för mental uppföljning{list(digest.flagged)} —
            värt ett kort enskilt samtal före nästa match.
          </DigestRow>
          <DigestRow icon="⚠️">
            <b>{digest.atRisk.length} visar tecken på minskat engagemang</b>
            {digest.atRisk.length
              ? `: ${digest.atRisk.map((item) => `${item.name} (${item.reason})`).join("; ")}`
              : ""}
            . Hör av dig innan det blir ett avhopp.
          </DigestRow>
          <p className="font-display border-line text-court-dark mt-3.5 border-t pt-3.5 text-[15px] italic">
            {digest.tip}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function DigestRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <span className="w-5 shrink-0 text-center text-[14px]">{icon}</span>
      <p className="text-[13px] leading-[1.55]">{children}</p>
    </div>
  );
}

function TeamPlanCard({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setStatus("saving");
    const response = await fetch("/api/team-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setStatus(response.ok ? "saved" : "error");
  }

  return (
    <section className="bg-court-dark text-chalk mb-6 rounded-xl border-t-2 border-[var(--brass)] px-5 py-4.5">
      <h2 className="text-ball mb-2.5 text-[11px] font-semibold tracking-[0.1em] uppercase">
        Lagets träningsplan — delas med AI:n
      </h2>
      <p className="font-display mb-3 text-[14.5px] leading-relaxed text-[#d3d9c9] italic">
        Det du skriver här används av AI:n när spelare frågar om extra individuell träning, så att
        förslagen matchar din planering och inte överbelastar ett område som redan tränas hårt i
        schemat.
      </p>
      <textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setStatus("idle");
        }}
        className="mm-dark-textarea min-h-16"
        rows={3}
      />
      <div className="mt-2.5 flex items-center gap-3">
        <button type="button" onClick={save} disabled={status === "saving"} className="mm-btn-ball">
          {status === "saving" ? "Sparar…" : "Spara plan"}
        </button>
        {status === "saved" ? (
          <span className="font-display text-ball text-[11.5px] italic">
            ✓ Sparat — AI:n använder nu den uppdaterade planen
          </span>
        ) : null}
        {status === "error" ? (
          <span className="font-display text-[11.5px] text-[#e8b3a2] italic">
            Kunde inte spara, försök igen
          </span>
        ) : null}
      </div>
    </section>
  );
}

function PlayerCard({ player, onOpen }: { player: PlayerSummary; onOpen: () => void }) {
  const flagged = player.needsFollowup || player.hasEscalation;
  const atRisk = player.risk.risk && !flagged;

  const cardTone = flagged
    ? "border-clay bg-clay-bg"
    : atRisk
      ? "border-amber bg-amber-bg"
      : "border-line bg-[var(--white)]";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`hover:border-brass relative rounded-[11px] border px-4 py-3.5 text-left transition hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(22,48,31,0.09)] ${cardTone}`}
    >
      {flagged ? (
        <span className="bg-clay absolute top-3 right-3 rounded-full px-2.5 py-[3px] text-[9.5px] font-bold tracking-[0.06em] text-white">
          UPPFÖLJNING
        </span>
      ) : atRisk ? (
        <span className="bg-amber absolute top-3 right-3 rounded-full px-2.5 py-[3px] text-[9.5px] font-bold tracking-[0.04em] text-white">
          RISK FÖR AVHOPP
        </span>
      ) : null}

      <div className="mb-2 flex items-center gap-3">
        <span
          className="font-display flex h-[37px] w-[37px] shrink-0 items-center justify-center rounded-full text-[15px] text-white"
          style={{ background: avatarColor(player.id) }}
        >
          {initials(player.name)}
        </span>
        <span>
          <span className="block text-[14.5px] font-semibold">{player.name}</span>
          <span className="text-ink-soft block text-[11.5px]">{player.level}</span>
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {player.tags.length ? (
          player.tags.map((tag) => (
            <span key={tag} className={`mm-tag ${atRisk ? "bg-amber-bg text-amber-dark" : ""}`}>
              {tag}
            </span>
          ))
        ) : (
          <span className="mm-tag">Inga taggar än</span>
        )}
      </div>

      <div className="border-line mt-2.5 flex items-center justify-between border-t pt-2.5">
        <Sparkline moods={player.moods} />
        <span className="text-ink-soft font-mono text-[11px]">
          {player.attendance}% träningsnärvaro
        </span>
      </div>
    </button>
  );
}
