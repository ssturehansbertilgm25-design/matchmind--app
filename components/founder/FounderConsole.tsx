"use client";

import { useEffect, useState } from "react";
import { call } from "./api";
import { OverviewTab } from "./OverviewTab";
import { ClubsTab } from "./ClubsTab";
import { UsersTab } from "./UsersTab";
import { InvitesTab } from "./InvitesTab";
import { FlagsTab } from "./FlagsTab";
import { AuditTab } from "./AuditTab";

const TABS = [
  { id: "overview", label: "Översikt" },
  { id: "clubs", label: "Klubbar" },
  { id: "users", label: "Användare" },
  { id: "invites", label: "Inbjudningar" },
  { id: "flags", label: "Flaggor" },
  { id: "audit", label: "Granskningslogg" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export type Club = {
  id: string;
  name: string;
  createdAt: string;
  coaches: number;
  players: number;
  teamPlan: string | null;
  teamPlanUpdatedAt: string | null;
};

export function FounderConsole() {
  const [tab, setTab] = useState<TabId>("overview");
  const [clubs, setClubs] = useState<Club[]>([]);

  // Klubblistan används av flera flikar (rollbyten, inbjudningar), så den hämtas här.
  async function loadClubs() {
    const result = await call<{ clubs: Club[] }>("/api/founder/clubs");
    if (result.ok) setClubs(result.data.clubs);
  }

  useEffect(() => {
    call<{ clubs: Club[] }>("/api/founder/clubs").then((result) => {
      if (result.ok) setClubs(result.data.clubs);
    });
  }, []);

  return (
    <>
      <div className="border-line mb-5 flex flex-wrap gap-1 overflow-x-auto border-b pb-px">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id}
            className={`rounded-t-lg px-4 py-2.5 text-[12.5px] font-semibold whitespace-nowrap transition ${
              tab === item.id
                ? "border-line text-ink -mb-px border border-b-[var(--white)] bg-[var(--white)]"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? <OverviewTab onJump={setTab} /> : null}
      {tab === "clubs" ? <ClubsTab clubs={clubs} onChanged={loadClubs} /> : null}
      {tab === "users" ? <UsersTab clubs={clubs} /> : null}
      {tab === "invites" ? <InvitesTab clubs={clubs} /> : null}
      {tab === "flags" ? <FlagsTab /> : null}
      {tab === "audit" ? <AuditTab /> : null}
    </>
  );
}

export function Panel({ children }: { children: React.ReactNode }) {
  return <div className="mm-card p-5">{children}</div>;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="bg-clay-bg text-clay-dark border-clay mb-3 rounded-lg border px-3 py-2 text-[12.5px]">
      {message}
    </p>
  );
}

export function Loading() {
  return <p className="text-ink-soft py-6 text-[13px] italic">Hämtar…</p>;
}
