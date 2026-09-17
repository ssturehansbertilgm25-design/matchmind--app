"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FLAG_LABEL, FLAG_TYPE } from "@/lib/constants";

type FlagItem = {
  id: string;
  type: string;
  reason: string;
  createdAt: string;
  playerId: string;
  playerName: string;
};

/** Flaggorna säger vad som behöver göras — aldrig vad spelaren skrivit. */
export function CoachFlags() {
  const router = useRouter();
  const [flags, setFlags] = useState<FlagItem[] | null>(null);

  useEffect(() => {
    fetch("/api/flags")
      .then((response) => response.json())
      .then((data) => setFlags(data.flags ?? []))
      .catch(() => setFlags([]));
  }, []);

  async function resolve(id: string) {
    await fetch(`/api/flags/${id}`, { method: "POST" });
    setFlags((current) => current?.filter((flag) => flag.id !== id) ?? null);
    router.refresh();
  }

  if (!flags || flags.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mm-section-title mb-3">
        Att göra <span className="text-ink-soft text-[12px] font-normal">{flags.length} öppna</span>
      </h2>
      <div className="flex flex-col gap-2">
        {flags.map((flag) => (
          <div
            key={flag.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-[11px] border px-4 py-3 ${
              flag.type === FLAG_TYPE.ESCALATION
                ? "border-clay bg-clay-bg"
                : "border-line bg-[var(--white)]"
            }`}
          >
            <div>
              <p className="text-[13.5px] font-semibold">{flag.playerName}</p>
              <p className="text-[12.5px] leading-snug">{flag.reason}</p>
              <p className="text-ink-soft mt-0.5 font-mono text-[11px]">
                {FLAG_LABEL[flag.type] ?? flag.type} ·{" "}
                {new Date(flag.createdAt).toLocaleDateString("sv-SE", {
                  day: "numeric",
                  month: "short",
                })}
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
    </section>
  );
}
