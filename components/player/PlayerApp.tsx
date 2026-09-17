"use client";

import { useState } from "react";
import { ReflectionTab, type ReflectionHistoryItem } from "./ReflectionTab";
import { SparringTab, type Clubmate } from "./SparringTab";
import { ExerciseTab } from "./ExerciseTab";

const TABS = [
  { id: "reflect", label: "Reflektion" },
  { id: "sparring", label: "Sparring-chatt" },
  { id: "exercises", label: "Övningar" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function PlayerApp({
  name,
  todayFocus,
  lastTag,
  history,
  clubmates,
  todayWeekday,
}: {
  name: string;
  todayFocus: string | null;
  lastTag: string | null;
  history: ReflectionHistoryItem[];
  clubmates: Clubmate[];
  todayWeekday: number;
}) {
  const [tab, setTab] = useState<TabId>("reflect");

  return (
    <>
      <div className="bg-chalk-dim mb-5 flex gap-1 rounded-[11px] p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id}
            className={`flex-1 rounded-lg px-1 py-2.5 text-[11.5px] font-semibold transition ${
              tab === item.id
                ? "text-ink bg-[var(--white)] shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                : "text-ink-soft"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="border-line rounded-[20px] border bg-[var(--white)] p-5 shadow-[0_8px_24px_rgba(22,48,31,0.08)]">
        {tab === "reflect" ? (
          <ReflectionTab
            name={name}
            todayFocus={todayFocus}
            lastTag={lastTag}
            history={history}
          />
        ) : null}
        {tab === "sparring" ? <SparringTab clubmates={clubmates} /> : null}
        {tab === "exercises" ? <ExerciseTab todayWeekday={todayWeekday} /> : null}
      </div>
    </>
  );
}

export function LoadingDots({ text }: { text: string }) {
  return (
    <div className="py-11 text-center">
      <div className="mb-4 inline-flex gap-1.5">
        <span className="mm-dot" />
        <span className="mm-dot" />
        <span className="mm-dot" />
      </div>
      <p className="font-display text-ink-soft text-[15px] italic">{text}</p>
    </div>
  );
}
