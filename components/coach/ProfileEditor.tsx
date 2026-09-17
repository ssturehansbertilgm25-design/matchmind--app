"use client";

import { useState } from "react";

export function ProfileEditor({
  playerId,
  initial,
}: {
  playerId: string;
  initial: {
    name: string;
    level: string;
    birthYear: number | null;
    attendance: number;
    guardianEmail: string | null;
    guardianConsent: boolean;
  };
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: initial.name,
    level: initial.level,
    birthYear: initial.birthYear?.toString() ?? "",
    attendance: initial.attendance.toString(),
    guardianEmail: initial.guardianEmail ?? "",
    guardianConsent: initial.guardianConsent,
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  function set(patch: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...patch }));
    setStatus("idle");
  }

  async function save() {
    setStatus("saving");
    setError(null);

    const response = await fetch(`/api/players/${playerId}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        level: form.level,
        birthYear: form.birthYear ? Number(form.birthYear) : undefined,
        trainingAttendance: Number(form.attendance),
        guardianEmail: form.guardianEmail || null,
        guardianConsent: form.guardianConsent,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Kunde inte spara");
      setStatus("idle");
      return;
    }
    setStatus("saved");
  }

  return (
    <section className="mm-card mb-5 px-4 py-3.5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-[13px] font-semibold">Spelaruppgifter</span>
        <span className="text-ink-soft font-mono text-[11px]">{open ? "dölj ▴" : "visa ▾"}</span>
      </button>

      {open ? (
        <div className="mt-3 flex flex-col gap-2.5">
          <label className="flex flex-col gap-1">
            <span className="mm-label">Namn</span>
            <input
              value={form.name}
              onChange={(event) => set({ name: event.target.value })}
              className="mm-input py-1.5 text-[12.5px]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="mm-label">Nivå</span>
            <input
              value={form.level}
              onChange={(event) => set({ level: event.target.value })}
              placeholder="t.ex. Tävling, DM-nivå"
              className="mm-input py-1.5 text-[12.5px]"
            />
          </label>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="mm-label">Födelseår</span>
              <input
                type="number"
                value={form.birthYear}
                onChange={(event) => set({ birthYear: event.target.value })}
                className="mm-input py-1.5 text-[12.5px]"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="mm-label">Närvaro %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={form.attendance}
                onChange={(event) => set({ attendance: event.target.value })}
                className="mm-input py-1.5 text-[12.5px]"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="mm-label">Målsmans e-post</span>
            <input
              type="email"
              value={form.guardianEmail}
              onChange={(event) => set({ guardianEmail: event.target.value })}
              className="mm-input py-1.5 text-[12.5px]"
            />
          </label>
          <label className="flex items-center gap-2 text-[12.5px]">
            <input
              type="checkbox"
              checked={form.guardianConsent}
              onChange={(event) => set({ guardianConsent: event.target.checked })}
              className="accent-clay"
            />
            Målsman har lämnat samtycke
          </label>

          {error ? (
            <p className="bg-clay-bg text-clay-dark border-clay rounded-lg border px-3 py-2 text-[12px]">
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={status === "saving"}
              className="mm-btn-ball px-5"
            >
              {status === "saving" ? "Sparar…" : "Spara uppgifter"}
            </button>
            {status === "saved" ? (
              <span className="text-ball-dark text-[12px] italic">✓ Sparat</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
