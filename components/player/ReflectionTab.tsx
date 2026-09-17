"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { REFLECTION_TAGS } from "@/lib/constants";
import { LoadingDots } from "./PlayerApp";

export type ReflectionHistoryItem = {
  id: string;
  createdAt: string;
  mood: number;
  tag: string | null;
  text: string | null;
};

type Feedback = { diagnosis: string; technique: string; followup: string };
type EscalationMessage = { title: string; text: string; note: string };

export function ReflectionTab({
  name,
  todayFocus,
  lastTag,
  history,
}: {
  name: string;
  todayFocus: string | null;
  lastTag: string | null;
  history: ReflectionHistoryItem[];
}) {
  const router = useRouter();
  const [mood, setMood] = useState<number | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [share, setShare] = useState(false);
  const [state, setState] = useState<"form" | "loading" | "done">("form");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [escalation, setEscalation] = useState<EscalationMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = mood !== null && (tag !== null || text.trim().length > 0);

  async function submit() {
    setState("loading");
    setError(null);

    const response = await fetch("/api/reflections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, tag, text: text.trim() || null, sharedWithCoach: share }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Kunde inte spara reflektionen");
      setState("form");
      return;
    }

    if (data.escalated) {
      setEscalation(data.message);
      setFeedback(null);
    } else {
      setFeedback(data.feedback);
      setEscalation(null);
    }
    setState("done");
    router.refresh();
  }

  function reset() {
    setMood(null);
    setTag(null);
    setText("");
    setShare(false);
    setFeedback(null);
    setEscalation(null);
    setState("form");
  }

  if (state === "loading") return <LoadingDots text="AI analyserar din reflektion…" />;

  if (state === "done") {
    return (
      <>
        {escalation ? (
          <div className="bg-clay-bg border-clay rounded-[11px] border-[1.5px] p-4">
            <h2 className="text-clay-dark mb-2 text-[10.5px] font-bold tracking-[0.09em] uppercase">
              {escalation.title}
            </h2>
            <p className="mb-3 text-[13.5px] leading-[1.6]">{escalation.text}</p>
            <p className="font-display text-ink-soft text-[11.5px] italic">{escalation.note}</p>
          </div>
        ) : null}

        {feedback ? (
          <div className="bg-chalk-dim border-clay rounded-[11px] border-t-2 p-4.5">
            <h2 className="text-clay mb-3 text-[10.5px] font-bold tracking-[0.09em] uppercase">
              Din mentala coach
            </h2>
            <div className="mb-3">
              <h3 className="font-display text-court-dark mb-1 text-[15px] italic">
                Vad som händer
              </h3>
              <p className="text-[13.5px] leading-[1.65]">{feedback.diagnosis}</p>
            </div>
            <div>
              <h3 className="font-display text-court-dark mb-1 text-[15px] italic">
                Vad du kan testa
              </h3>
              <p className="text-[13.5px] leading-[1.65]">{feedback.technique}</p>
            </div>
            <p className="border-line text-ink-soft mt-3 border-t pt-3 text-[12.5px]">
              {feedback.followup}
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={reset}
          className="border-line text-ink-soft mt-3 rounded-full border px-4 py-2 text-[12px]"
        >
          ← Tillbaka
        </button>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-[23px] leading-tight">Hej {name.split(" ")[0]}</h1>
      <p className="font-display text-ink-soft mb-4 text-[14.5px] italic">
        {todayFocus ? `${todayFocus} — hur kändes det?` : "Hur har det känts på planen idag?"}
      </p>

      {lastTag ? (
        <div className="bg-court-dark text-chalk mb-5 flex items-center gap-3 rounded-[11px] border-l-[3px] border-[var(--ball)] px-4 py-3 text-[13px]">
          Ditt fokus från förra reflektionen: {lastTag.toLowerCase()}.
        </div>
      ) : null}

      <p className="mb-2.5 text-[13px] font-semibold">Hur kändes matchen mentalt, 1–5?</p>
      <div className="mb-5 flex gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMood(value)}
            aria-pressed={mood === value}
            className={`border-line flex-1 rounded-[9px] border-[1.5px] py-3 font-mono text-[15px] font-bold transition ${
              mood === value ? "bg-court border-court text-white" : "bg-[var(--white)]"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <p className="mb-2.5 text-[13px] font-semibold">Något som stack ut?</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {REFLECTION_TAGS.map((item) => (
          <button
            key={item.tag}
            type="button"
            onClick={() => setTag(tag === item.tag ? null : item.tag)}
            aria-pressed={tag === item.tag}
            className="mm-choice"
          >
            {item.emoji} {item.tag}
          </button>
        ))}
      </div>

      <p className="mb-2.5 text-[13px] font-semibold">Eller skriv med egna ord</p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Skriv fritt om hur det kändes idag…"
        className="mm-input mb-4 min-h-17"
        rows={3}
      />

      <label className="border-line mb-4 flex cursor-pointer items-start gap-2.5 rounded-[9px] border px-3.5 py-3 text-[12.5px] leading-snug">
        <input
          type="checkbox"
          checked={share}
          onChange={(event) => setShare(event.target.checked)}
          className="accent-clay mt-0.5"
        />
        <span>
          Dela den här reflektionen med min tränare
          <span className="text-ink-soft block text-[11.5px]">
            Utan kryss ser tränaren bara mående och tagg — aldrig din text.
          </span>
        </span>
      </label>

      <button
        type="button"
        disabled
        title="Röstinspelning kommer snart"
        className="bg-chalk-dim border-line text-ink-soft mb-5 flex w-full cursor-not-allowed items-center gap-3 rounded-[11px] border-[1.5px] border-dashed px-4 py-3.5 text-[13px]"
      >
        <span className="bg-clay flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] text-white">
          🎙
        </span>
        Spela in med rösten — kommer snart
      </button>

      {error ? (
        <p className="bg-clay-bg text-clay-dark border-clay mb-3 rounded-lg border px-3 py-2 text-[12.5px]">
          {error}
        </p>
      ) : null}

      <button type="button" onClick={submit} disabled={!ready} className="mm-btn-primary">
        Skicka reflektion
      </button>

      {history.length ? (
        <div className="mt-6">
          <h2 className="mm-label mb-2.5">Dina senaste reflektioner</h2>
          {history.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="border-line flex items-start gap-3 border-b py-2.5 text-[12.5px]"
            >
              <span className="text-brass w-11 shrink-0 font-mono">
                {new Date(item.createdAt).toLocaleDateString("sv-SE", {
                  day: "numeric",
                  month: "numeric",
                })}
              </span>
              <span>{item.text ?? `Mående ${item.mood}/5${item.tag ? ` · ${item.tag}` : ""}`}</span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
