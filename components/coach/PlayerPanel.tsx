"use client";

import { useEffect, useState } from "react";
import type { ParentReport, PlayerDetail } from "@/lib/players";
import { DAYS, INTENSITY_LABEL } from "@/lib/constants";
import { Sparkline } from "./Sparkline";
import { avatarColor, initials } from "./avatar";

const PILL_CLASS: Record<string, string> = {
  HIGH: "mm-pill-high",
  MEDIUM: "mm-pill-medium",
  LOW: "mm-pill-low",
  REST: "mm-pill-rest",
};

export function PlayerPanel({ playerId, onClose }: { playerId: string; onClose: () => void }) {
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/players/${playerId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!active) return;
        if (!response.ok) setError(data.error ?? "Kunde inte hämta spelaren");
        else setPlayer(data.player);
      })
      .catch(() => active && setError("Kunde inte hämta spelaren"));
    return () => {
      active = false;
    };
  }, [playerId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-30 flex justify-end bg-[rgba(22,30,25,0.5)]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="bg-chalk h-full w-[min(470px,92%)] overflow-y-auto p-6 shadow-[-10px_0_30px_rgba(0,0,0,0.16)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Stäng"
          className="border-line text-ink-soft float-right h-[30px] w-[30px] rounded-lg border"
        >
          ✕
        </button>

        {error ? <p className="text-clay-dark pt-10 text-[13px]">{error}</p> : null}
        {!player && !error ? (
          <p className="font-display text-ink-soft pt-10 text-[15px] italic">Hämtar spelare…</p>
        ) : null}
        {player ? <PanelBody player={player} /> : null}
      </aside>
    </div>
  );
}

function PanelBody({ player }: { player: PlayerDetail }) {
  const flagged = player.needsFollowup || player.hasEscalation;

  return (
    <>
      <div className="mb-5 flex items-center gap-3.5">
        <span
          className="font-display flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full text-[18px] text-white"
          style={{ background: avatarColor(player.id) }}
        >
          {initials(player.name)}
        </span>
        <div>
          <h2 className="font-display text-[25px] leading-tight">{player.name}</h2>
          <p className="text-ink-soft text-[12.5px]">
            {player.level} · {player.attendance}% träningsnärvaro senaste månaden
          </p>
        </div>
      </div>

      {flagged ? (
        <p className="bg-clay-bg border-clay text-clay-dark mb-4 rounded-[9px] border px-3.5 py-2.5 text-[12.5px] leading-relaxed">
          {player.flags.map((flag) => flag.reason).join(" ") ||
            "Flaggad för mental uppföljning."}
        </p>
      ) : player.risk.risk ? (
        <p className="bg-amber-bg border-amber text-amber-dark mb-4 rounded-[9px] border px-3.5 py-2.5 text-[12.5px] leading-relaxed">
          Risk för avhopp — {player.risk.reason}
        </p>
      ) : null}

      <section className="mm-card mb-5 px-4 py-3.5">
        <h3 className="mm-label mb-1.5">Sammanfattning</h3>
        <p className="text-[13px] leading-[1.55]">{player.aiSummary}</p>
      </section>

      <div className="mb-5 flex items-center justify-between">
        <Sparkline moods={player.moods} />
        <div className="flex flex-wrap justify-end gap-1.5">
          {player.tags.map((tag) => (
            <span key={tag} className="mm-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <h3 className="mm-section-title mb-1 text-[17px]">Veckoschema</h3>
      <table className="mb-6 w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            {["Dag", "Tid", "Fokus", "Belastning"].map((header) => (
              <th
                key={header}
                className="mm-label border-b-[1.5px] border-[var(--brass-soft)] px-2 py-1.5 text-left"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {player.schedule.map((entry) => (
            <tr key={entry.weekday}>
              <td className="border-line border-b px-2 py-2">{DAYS[entry.weekday]}</td>
              <td className="border-line text-ink-soft border-b px-2 py-2 font-mono">
                {entry.time ?? "—"}
              </td>
              <td className="border-line border-b px-2 py-2">{entry.focus}</td>
              <td className="border-line border-b px-2 py-2">
                <span className={`mm-pill ${PILL_CLASS[entry.intensity] ?? "mm-pill-rest"}`}>
                  {INTENSITY_LABEL[entry.intensity] ?? entry.intensity}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mm-section-title mb-2 text-[17px]">Senaste reflektioner</h3>
      <div className="flex flex-col gap-2">
        {player.reflections.map((reflection) => (
          <div key={reflection.id} className="mm-card px-4 py-3">
            <div className="text-brass mb-1 flex items-center justify-between font-mono text-[11px]">
              <span>
                {new Date(reflection.createdAt).toLocaleDateString("sv-SE", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span>mående {reflection.mood}/5</span>
            </div>
            {reflection.tag ? <span className="mm-tag">{reflection.tag}</span> : null}
            {/* Regel 3: råtext visas bara när spelaren delat reflektionen. */}
            {reflection.sharedWithCoach && reflection.text ? (
              <p className="mt-1.5 text-[13.5px] leading-[1.55]">{reflection.text}</p>
            ) : (
              <p className="text-ink-soft mt-1.5 text-[12px] italic">
                Spelaren har inte delat texten — endast mående och tagg visas.
              </p>
            )}
          </div>
        ))}
        {player.reflections.length === 0 ? (
          <p className="text-ink-soft text-[13px] italic">Inga reflektioner ännu.</p>
        ) : null}
      </div>

      <CoachNote playerId={player.id} playerName={player.name} initialText={player.note} />
      <ParentReportSection playerId={player.id} />
    </>
  );
}

function CoachNote({
  playerId,
  playerName,
  initialText,
}: {
  playerId: string;
  playerName: string;
  initialText: string;
}) {
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setStatus("saving");
    const response = await fetch(`/api/players/${playerId}/note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setStatus(response.ok ? "saved" : "error");
  }

  return (
    <section className="bg-court-dark text-chalk mt-5 rounded-[11px] border-t-2 border-[var(--brass)] p-4">
      <h3 className="text-ball mb-2 text-[11px] font-semibold tracking-[0.09em] uppercase">
        Din anteckning till {playerName.split(" ")[0]}
      </h3>
      <textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setStatus("idle");
        }}
        placeholder="T.ex. en fråga att ta upp på nästa träning…"
        className="mm-dark-textarea min-h-13"
        rows={2}
      />
      <div className="mt-2.5 flex items-center gap-3">
        <button type="button" onClick={save} disabled={status === "saving"} className="mm-btn-ball">
          {status === "saving" ? "Sparar…" : "Spara anteckning"}
        </button>
        {status === "saved" ? (
          <span className="font-display text-ball text-[11.5px] italic">✓ Sparat</span>
        ) : null}
        {status === "error" ? (
          <span className="font-display text-[11.5px] text-[#e8b3a2] italic">
            Kunde inte spara
          </span>
        ) : null}
      </div>
    </section>
  );
}

function ParentReportSection({ playerId }: { playerId: string }) {
  const [report, setReport] = useState<ParentReport | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (report) {
      setOpen(true);
      return;
    }
    setBusy(true);
    const response = await fetch(`/api/players/${playerId}/parent-report`);
    const data = await response.json();
    setBusy(false);
    if (response.ok) {
      setReport(data.report);
      setOpen(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className="border-brass text-brass hover:bg-[var(--brass-wash)] mt-5 w-full rounded-full border-[1.5px] bg-[var(--white)] py-2.5 text-[11.5px] font-bold tracking-[0.05em] uppercase"
      >
        {busy ? "Genererar…" : open ? "Dölj föräldrarapport" : "Generera föräldrarapport"}
      </button>

      {open && report ? (
        <div className="mt-3.5 rounded-[11px] border border-[var(--brass-soft)] bg-[var(--white)] px-5 py-4.5">
          <h4 className="font-display text-[18px]">Utvecklingsrapport — {report.playerName}</h4>
          <p className="text-ink-soft mb-4 font-mono text-[11px]">Period: {report.period}</p>
          <ReportRow label="Träningsnärvaro" value={report.attendance} />
          <ReportRow label="Mental utveckling" value={report.mentalDevelopment} />
          <ReportRow label="Aktuellt fokusområde" value={report.focusAreas} />
          <ReportRow label="Tränarens rekommendation" value={report.recommendation} />
          <p className="border-line text-ink-soft mt-3.5 border-t pt-3 text-[11px] italic">
            {report.disclaimer}
          </p>
        </div>
      ) : null}
    </>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <div className="text-brass mb-[3px] text-[10px] font-bold tracking-[0.07em] uppercase">
        {label}
      </div>
      <div className="text-[13px] leading-[1.5]">{value}</div>
    </div>
  );
}
