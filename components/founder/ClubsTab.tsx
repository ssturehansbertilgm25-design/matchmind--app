"use client";

import { useState } from "react";
import { call } from "./api";
import { ErrorNote, Panel, type Club } from "./FounderConsole";

export function ClubsTab({ clubs, onChanged }: { clubs: Club[]; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createClub(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await call("/api/founder/clubs", { method: "POST", body: { name } });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    onChanged();
  }

  return (
    <>
      <Panel>
        <h2 className="font-display mb-3 text-[18px]">Ny klubb</h2>
        <ErrorNote message={error} />
        <form onSubmit={createClub} className="flex flex-wrap gap-2">
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Klubbens namn"
            className="mm-input flex-1 min-w-[200px]"
          />
          <button type="submit" disabled={busy} className="mm-btn-ball px-5">
            {busy ? "Skapar…" : "Skapa klubb"}
          </button>
        </form>
      </Panel>

      <div className="mt-4 flex flex-col gap-3">
        {clubs.length === 0 ? (
          <p className="text-ink-soft text-[13px] italic">
            Inga klubbar ännu. Skapa en, bjud sedan in en tränare till den.
          </p>
        ) : null}
        {clubs.map((club) => (
          <ClubCard key={club.id} club={club} onChanged={onChanged} />
        ))}
      </div>
    </>
  );
}

function ClubCard({ club, onChanged }: { club: Club; onChanged: () => void }) {
  const [name, setName] = useState(club.name);
  const [plan, setPlan] = useState(club.teamPlan ?? "");
  const [confirm, setConfirm] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function save(body: { name?: string; teamPlan?: string }, message: string) {
    setError(null);
    const result = await call(`/api/founder/clubs/${club.id}`, { method: "PATCH", body });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStatus(message);
    onChanged();
    setTimeout(() => setStatus(null), 2500);
  }

  async function remove() {
    setError(null);
    const result = await call(
      `/api/founder/clubs/${club.id}?confirm=${encodeURIComponent(confirm)}`,
      { method: "DELETE" },
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChanged();
  }

  return (
    <Panel>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-[19px]">{club.name}</h3>
          <p className="text-ink-soft text-[12px]">
            {club.players} spelare · {club.coaches} tränare
          </p>
        </div>
        {status ? <span className="text-ball-dark text-[12px] italic">{status}</span> : null}
      </div>

      <ErrorNote message={error} />

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mm-input flex-1 min-w-[200px]"
        />
        <button
          type="button"
          onClick={() => save({ name }, "✓ Namnet sparat")}
          disabled={name.trim() === club.name}
          className="border-line hover:border-brass rounded-full border px-4 py-2 text-[12px] font-semibold disabled:opacity-40"
        >
          Byt namn
        </button>
      </div>

      <label className="mm-label mb-1.5 block">Lagets träningsplan (används av AI:n)</label>
      <textarea
        value={plan}
        onChange={(event) => setPlan(event.target.value)}
        rows={3}
        placeholder="Tränarens upplägg för perioden…"
        className="mm-input mb-2 min-h-16"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => save({ teamPlan: plan }, "✓ Planen sparad")}
          className="mm-btn-ball px-5"
        >
          Spara plan
        </button>
        <button
          type="button"
          onClick={() => setShowDelete((value) => !value)}
          className="text-clay ml-auto text-[12px] underline"
        >
          Radera klubb
        </button>
      </div>

      {showDelete ? (
        <div className="bg-clay-bg border-clay mt-3 rounded-lg border px-4 py-3">
          <p className="text-clay-dark mb-2 text-[12.5px] leading-relaxed">
            Raderar klubben och <strong>alla dess konton, reflektioner och scheman</strong>. Går
            inte att ångra. Skriv <strong>{club.name}</strong> för att bekräfta.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="mm-input flex-1 min-w-[180px]"
              placeholder={club.name}
            />
            <button
              type="button"
              onClick={remove}
              disabled={confirm !== club.name}
              className="bg-clay rounded-full px-4 py-2 text-[12px] font-bold text-white disabled:opacity-40"
            >
              Radera permanent
            </button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
