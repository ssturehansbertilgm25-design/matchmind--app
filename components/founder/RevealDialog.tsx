"use client";

import { useState } from "react";
import { call, formatDate } from "./api";
import { ErrorNote } from "./FounderConsole";

type Revealed = {
  playerName: string;
  loggedAs: string;
  reflections: { id: string; createdAt: string; mood: number; tag: string | null; text: string }[];
};

/**
 * Break-glass-dialogen. Texten hämtas först när ett skäl är skrivet, och varje öppning
 * loggas i granskningsloggen med skälet — det är inget som går att ångra i efterhand.
 */
export function RevealDialog({
  playerId,
  playerName,
  onClose,
}: {
  playerId: string;
  playerName: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<Revealed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reveal(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await call<Revealed>(`/api/founder/players/${playerId}/reveal`, {
      method: "POST",
      body: { reason },
    });
    setBusy(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setResult(response.data);
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-[rgba(22,30,25,0.55)] p-4 py-10"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="bg-chalk w-full max-w-[560px] rounded-[14px] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.25)]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[22px] leading-tight">
              Öppna reflektionstext — {playerName}
            </h2>
            <p className="text-ink-soft text-[12.5px]">
              Spelaren har inte delat de här texterna med sin tränare.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="border-line text-ink-soft h-[30px] w-[30px] shrink-0 rounded-lg border"
          >
            ✕
          </button>
        </div>

        {!result ? (
          <form onSubmit={reveal}>
            <div className="bg-amber-bg border-amber text-amber-dark mb-3 rounded-lg border px-4 py-3 text-[12.5px] leading-relaxed">
              Det här är känsliga uppgifter om en minderårig. Öppna bara när du har ett konkret
              skäl — en oro för spelarens säkerhet, en anmälan eller ett myndighetsärende. Skälet
              du skriver sparas i granskningsloggen tillsammans med ditt namn och tidpunkten, och
              går inte att radera.
            </div>
            <ErrorNote message={error} />
            <label className="mm-label mb-1.5 block">Skäl</label>
            <textarea
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="T.ex. Orosanmälan inkommen från förälder 2026-09-17, samråd med tränare."
              className="mm-input mb-3 min-h-16"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="border-line rounded-full border px-4 py-2 text-[12px] font-semibold"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={busy}
                className="bg-clay rounded-full px-4 py-2 text-[12px] font-bold text-white disabled:opacity-40"
              >
                {busy ? "Öppnar…" : "Öppna och logga"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="bg-court-bg border-court text-court-dark mb-3 rounded-lg border px-3 py-2 text-[12px]">
              Loggat som {result.loggedAs}. {result.reflections.length} texter visas.
            </p>
            <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
              {result.reflections.map((reflection) => (
                <div key={reflection.id} className="mm-card px-4 py-3">
                  <div className="text-brass mb-1 flex justify-between font-mono text-[11px]">
                    <span>{formatDate(reflection.createdAt)}</span>
                    <span>mående {reflection.mood}/5</span>
                  </div>
                  {reflection.tag ? <span className="mm-tag">{reflection.tag}</span> : null}
                  <p className="mt-1.5 text-[13.5px] leading-[1.55]">{reflection.text}</p>
                </div>
              ))}
              {result.reflections.length === 0 ? (
                <p className="text-ink-soft text-[13px] italic">
                  Spelaren har inga reflektioner med text.
                </p>
              ) : null}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="border-line rounded-full border px-4 py-2 text-[12px] font-semibold"
              >
                Stäng
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
