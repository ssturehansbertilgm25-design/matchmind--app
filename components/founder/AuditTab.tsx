"use client";

import { useEffect, useState } from "react";
import { AUDIT, AUDIT_LABEL } from "@/lib/constants";
import { call, formatDate } from "./api";
import { ErrorNote, Loading } from "./FounderConsole";

type Entry = {
  id: string;
  action: string;
  actorEmail: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  meta: unknown;
  createdAt: string;
};

export function AuditTab() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [action, setAction] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    call<{ entries: Entry[] }>(`/api/founder/audit?${params}`).then((result) =>
      result.ok ? setEntries(result.data.entries) : setError(result.error),
    );
  }, [action]);

  return (
    <>
      <p className="text-ink-soft mb-3 text-[12.5px] leading-relaxed">
        Loggen skrivs av appen och kan inte redigeras eller raderas härifrån. Den finns för att en
        spelare, en förälder eller en granskare ska kunna få svar på vem som gjort vad.
      </p>

      <div className="mb-3">
        <select
          value={action}
          onChange={(event) => setAction(event.target.value)}
          className="mm-input w-auto"
        >
          <option value="">Alla händelser</option>
          {Object.values(AUDIT).map((item) => (
            <option key={item} value={item}>
              {AUDIT_LABEL[item] ?? item}
            </option>
          ))}
        </select>
      </div>

      <ErrorNote message={error} />
      {!entries ? <Loading /> : null}
      {entries?.length === 0 ? (
        <p className="text-ink-soft text-[13px] italic">Inget loggat för det filtret.</p>
      ) : null}

      <div className="flex flex-col gap-2">
        {entries?.map((entry) => (
          <div
            key={entry.id}
            className={`rounded-[10px] border px-4 py-3 ${
              entry.action === AUDIT.REFLECTION_TEXT_REVEALED
                ? "border-clay bg-clay-bg"
                : "border-line bg-[var(--white)]"
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[13px] font-semibold">
                {AUDIT_LABEL[entry.action] ?? entry.action}
              </span>
              <span className="text-brass font-mono text-[11px]">
                {formatDate(entry.createdAt)}
              </span>
            </div>
            <p className="text-ink-soft text-[12px]">
              {entry.actorEmail}
              {entry.targetType ? ` · ${entry.targetType} ${entry.targetId?.slice(0, 8)}…` : ""}
            </p>
            {entry.reason ? (
              <p className="mt-1 text-[12.5px] italic">Skäl: ”{entry.reason}”</p>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}
