"use client";

import { useState } from "react";
import { DAYS, INTENSITY, INTENSITY_LABEL, MUSCLE_GROUPS } from "@/lib/constants";

export type ScheduleRow = {
  weekday: number;
  time: string | null;
  focus: string;
  muscleGroup: string | null;
  intensity: string;
};

const PILL_CLASS: Record<string, string> = {
  HIGH: "mm-pill-high",
  MEDIUM: "mm-pill-medium",
  LOW: "mm-pill-low",
  REST: "mm-pill-rest",
};

function emptyWeek(existing: ScheduleRow[]): ScheduleRow[] {
  return DAYS.map((_, weekday) => {
    const found = existing.find((entry) => entry.weekday === weekday);
    return (
      found ?? { weekday, time: null, focus: "Vila", muscleGroup: null, intensity: INTENSITY.REST }
    );
  });
}

/**
 * Veckoschemat är underlaget för belastningskollen, så tränaren måste kunna ändra det.
 * Muskelgrupp + belastning är det som styr om ett extrapass godkänns.
 */
export function ScheduleEditor({
  playerId,
  schedule,
}: {
  playerId: string;
  schedule: ScheduleRow[];
}) {
  const [rows, setRows] = useState<ScheduleRow[]>(emptyWeek(schedule));
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function update(weekday: number, patch: Partial<ScheduleRow>) {
    setRows((current) =>
      current.map((row) => (row.weekday === weekday ? { ...row, ...patch } : row)),
    );
    setStatus("idle");
  }

  async function save() {
    setStatus("saving");
    const response = await fetch(`/api/players/${playerId}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: rows }),
    });
    setStatus(response.ok ? "saved" : "error");
    if (response.ok) setEditing(false);
  }

  return (
    <>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="mm-section-title text-[17px]">Veckoschema</h3>
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className="text-brass text-[12px] underline"
        >
          {editing ? "Klar" : "Redigera"}
        </button>
      </div>

      {!editing ? (
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
            {rows.map((entry) => (
              <tr key={entry.weekday}>
                <td className="border-line border-b px-2 py-2">{DAYS[entry.weekday]}</td>
                <td className="border-line text-ink-soft border-b px-2 py-2 font-mono">
                  {entry.time ?? "—"}
                </td>
                <td className="border-line border-b px-2 py-2">
                  {entry.focus}
                  {entry.muscleGroup ? (
                    <span className="text-ink-soft"> · {entry.muscleGroup}</span>
                  ) : null}
                </td>
                <td className="border-line border-b px-2 py-2">
                  <span className={`mm-pill ${PILL_CLASS[entry.intensity] ?? "mm-pill-rest"}`}>
                    {INTENSITY_LABEL[entry.intensity] ?? entry.intensity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mb-6 flex flex-col gap-2">
          {rows.map((entry) => (
            <div key={entry.weekday} className="border-line rounded-lg border px-3 py-2.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-semibold">{DAYS[entry.weekday]}</span>
                <select
                  value={entry.intensity}
                  onChange={(event) => update(entry.weekday, { intensity: event.target.value })}
                  className="mm-input w-auto py-1 text-[12px]"
                >
                  {Object.values(INTENSITY).map((value) => (
                    <option key={value} value={value}>
                      {INTENSITY_LABEL[value]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  value={entry.focus}
                  onChange={(event) => update(entry.weekday, { focus: event.target.value })}
                  placeholder="Fokus, t.ex. Styrka (ben)"
                  className="mm-input flex-1 min-w-[140px] py-1.5 text-[12.5px]"
                />
                <input
                  value={entry.time ?? ""}
                  onChange={(event) => update(entry.weekday, { time: event.target.value || null })}
                  placeholder="17:00"
                  className="mm-input w-[80px] py-1.5 text-[12.5px]"
                />
                <select
                  value={entry.muscleGroup ?? ""}
                  onChange={(event) =>
                    update(entry.weekday, { muscleGroup: event.target.value || null })
                  }
                  className="mm-input w-auto py-1.5 text-[12px]"
                >
                  <option value="">Ingen muskelgrupp</option>
                  {MUSCLE_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3">
            <button type="button" onClick={save} disabled={status === "saving"} className="mm-btn-ball px-5">
              {status === "saving" ? "Sparar…" : "Spara schema"}
            </button>
            {status === "error" ? (
              <span className="text-clay text-[12px]">Kunde inte spara</span>
            ) : null}
          </div>
        </div>
      )}

      {status === "saved" && !editing ? (
        <p className="text-ball-dark -mt-4 mb-4 text-[12px] italic">✓ Schemat sparat</p>
      ) : null}
    </>
  );
}
