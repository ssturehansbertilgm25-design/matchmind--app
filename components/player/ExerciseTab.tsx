"use client";

import { useState } from "react";
import { DAYS, MUSCLE_GROUPS } from "@/lib/constants";
import type { LoadDecision } from "@/lib/load";
import type { Exercise } from "@/lib/exercises";
import { LoadingDots } from "./PlayerApp";

type Result = {
  decision: LoadDecision;
  exercises: Exercise[];
  message: string;
  usedTeamPlan: boolean;
};

export function ExerciseTab({ todayWeekday }: { todayWeekday: number }) {
  const [mode, setMode] = useState<"now" | "extra">("now");
  const [muscleGroup, setMuscleGroup] = useState<string | null>(null);
  const [weekday, setWeekday] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = muscleGroup !== null && (mode === "now" || weekday !== null);

  async function ask() {
    setLoading(true);
    setResult(null);
    setError(null);

    const response = await fetch("/api/exercises/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ muscleGroup, weekday: mode === "extra" ? weekday : null }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Kunde inte hämta förslag");
      return;
    }
    setResult(data);
  }

  return (
    <>
      <h1 className="font-display text-[23px] leading-tight">Övningar &amp; extra träning</h1>
      <p className="font-display text-ink-soft mb-4 text-[14.5px] italic">
        Baserat på din tränares plan och ditt schema denna vecka
      </p>

      <div className="mb-4 flex gap-2">
        {[
          { id: "now", label: "Övningsförslag nu" },
          { id: "extra", label: "Fråga om extra träning" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setMode(item.id as "now" | "extra");
              setWeekday(null);
              setResult(null);
            }}
            aria-pressed={mode === item.id}
            className={`border-line flex-1 rounded-[9px] border-[1.5px] py-2.5 text-[11.5px] font-semibold transition ${
              mode === item.id ? "bg-clay border-clay text-white" : "bg-[var(--white)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="mb-2.5 text-[13px] font-semibold">Vilken muskelgrupp?</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {MUSCLE_GROUPS.map((group) => (
          <button
            key={group}
            type="button"
            onClick={() => setMuscleGroup(group)}
            aria-pressed={muscleGroup === group}
            className="mm-choice mm-choice-court"
          >
            {group}
          </button>
        ))}
      </div>

      {mode === "extra" ? (
        <>
          <p className="mb-2.5 text-[13px] font-semibold">Vilken dag vill du lägga passet?</p>
          <div className="mb-5 flex flex-wrap gap-1.5">
            {DAYS.map((day, index) => (
              <button
                key={day}
                type="button"
                onClick={() => setWeekday(index)}
                aria-pressed={weekday === index}
                className={`border-line rounded-lg border-[1.5px] px-3 py-1.5 font-mono text-[12px] transition ${
                  weekday === index ? "bg-court border-court text-white" : "bg-[var(--white)]"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-ink-soft mb-5 text-[12px]">
          Vi utgår från dagens pass ({DAYS[todayWeekday]}) i ditt schema.
        </p>
      )}

      <button type="button" onClick={ask} disabled={!ready || loading} className="mm-btn-primary">
        Fråga AI:n
      </button>

      {error ? (
        <p className="bg-clay-bg text-clay-dark border-clay mt-3 rounded-lg border px-3 py-2 text-[12.5px]">
          {error}
        </p>
      ) : null}

      {loading ? <LoadingDots text="Kollar ditt schema och tränarens plan…" /> : null}

      {result ? (
        <div className="mt-4">
          <div
            className={`rounded-[11px] border-[1.5px] px-4 py-3.5 text-[13px] leading-[1.55] ${
              result.decision.approved
                ? "bg-court-bg border-court"
                : "bg-clay-bg border-clay"
            }`}
          >
            <h2
              className={`mb-1.5 text-[10.5px] font-bold tracking-[0.09em] uppercase ${
                result.decision.approved ? "text-court-dark" : "text-clay-dark"
              }`}
            >
              {result.decision.approved
                ? `${result.decision.requestedDayLabel} funkar bra`
                : "Risk för överbelastning"}
            </h2>
            <p>{result.message}</p>
            {!result.decision.approved && result.decision.suggestedDayLabel ? (
              <p className="mt-2 text-[12.5px]">
                Förslag: lägg passet på <strong>{result.decision.suggestedDayLabel}</strong> istället.
              </p>
            ) : null}
          </div>

          <ul className="mt-3">
            {result.exercises.map((exercise) => (
              <li
                key={exercise.name}
                className="border-line flex justify-between gap-2.5 border-b py-2.5 text-[13px] last:border-b-0"
              >
                <span className="font-semibold">{exercise.name}</span>
                <span className="text-brass text-right font-mono text-[12px]">
                  {exercise.detail}
                </span>
              </li>
            ))}
          </ul>

          <p className="text-ink-soft mt-3 text-[11.5px] italic">
            {result.decision.level === "tung" ? "Tunga övningar" : "Lätta övningar"} ·{" "}
            {result.usedTeamPlan
              ? "matchat mot tränarens träningsplan"
              : "ingen träningsplan sparad av tränaren ännu"}
          </p>
        </div>
      ) : null}
    </>
  );
}
