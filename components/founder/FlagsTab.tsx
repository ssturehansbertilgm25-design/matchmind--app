"use client";

import { useEffect, useState } from "react";
import { FLAG_LABEL, FLAG_TYPE } from "@/lib/constants";
import { call, formatDate } from "./api";
import { ErrorNote, Loading } from "./FounderConsole";

export type FlagItem = {
  id: string;
  type: string;
  reason: string;
  createdAt: string;
  playerId: string;
  playerName: string;
  clubName: string | null;
};

export function FlagsTab() {
  const [flags, setFlags] = useState<FlagItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const result = await call<{ flags: FlagItem[] }>("/api/flags");
    if (result.ok) setFlags(result.data.flags);
    else setError(result.error);
  }

  useEffect(() => {
    call<{ flags: FlagItem[] }>("/api/flags").then((result) => {
      if (result.ok) setFlags(result.data.flags);
      else setError(result.error);
    });
  }, []);

  async function resolve(id: string) {
    const result = await call(`/api/flags/${id}`, { method: "POST" });
    if (!result.ok) setError(result.error);
    void load();
  }

  if (!flags && !error) return <Loading />;

  return (
    <>
      <p className="text-ink-soft mb-3 text-[12.5px] leading-relaxed">
        Flaggor säger vad som behöver göras, aldrig vad spelaren skrivit. En eskalering betyder:
        hör av dig till spelaren.
      </p>
      <ErrorNote message={error} />

      {flags?.length === 0 ? (
        <p className="text-ink-soft text-[13px] italic">Inga öppna flaggor just nu.</p>
      ) : null}

      <div className="flex flex-col gap-2">
        {flags?.map((flag) => (
          <div
            key={flag.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-[11px] border px-4 py-3 ${
              flag.type === FLAG_TYPE.ESCALATION
                ? "border-clay bg-clay-bg"
                : "border-line bg-[var(--white)]"
            }`}
          >
            <div>
              <p className="text-[13.5px] font-semibold">
                {flag.playerName}
                {flag.clubName ? (
                  <span className="text-ink-soft font-normal"> · {flag.clubName}</span>
                ) : null}
              </p>
              <p className="text-[12.5px] leading-snug">{flag.reason}</p>
              <p className="text-ink-soft mt-0.5 font-mono text-[11px]">
                {FLAG_LABEL[flag.type] ?? flag.type} · {formatDate(flag.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => resolve(flag.id)}
              className="border-line hover:border-brass rounded-full border bg-[var(--white)] px-4 py-2 text-[12px] font-semibold"
            >
              Markera åtgärdad
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
