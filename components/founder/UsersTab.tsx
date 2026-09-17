"use client";

import { useCallback, useEffect, useState } from "react";
import { ROLE, ROLE_LABEL } from "@/lib/constants";
import { call, formatDate } from "./api";
import { ErrorNote, Loading, Panel, type Club } from "./FounderConsole";
import { RevealDialog } from "./RevealDialog";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  clubId: string | null;
  clubName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  reflectionCount: number;
  sessionCount: number;
};

export function UsersTab({ clubs }: { clubs: Club[] }) {
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [revealFor, setRevealFor] = useState<ManagedUser | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (roleFilter) params.set("role", roleFilter);
    const result = await call<{ users: ManagedUser[] }>(`/api/founder/users?${params}`);
    if (result.ok) setUsers(result.data.users);
    else setError(result.error);
  }, [query, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Sök namn eller e-post"
          className="mm-input flex-1 min-w-[200px]"
        />
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="mm-input w-auto"
        >
          <option value="">Alla roller</option>
          {Object.values(ROLE).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role]}
            </option>
          ))}
        </select>
      </div>

      <ErrorNote message={error} />
      {!users ? <Loading /> : null}

      <div className="flex flex-col gap-3">
        {users?.length === 0 ? (
          <p className="text-ink-soft text-[13px] italic">Inga konton matchar sökningen.</p>
        ) : null}
        {users?.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            clubs={clubs}
            onChanged={load}
            onReveal={() => setRevealFor(user)}
          />
        ))}
      </div>

      {revealFor ? (
        <RevealDialog
          playerId={revealFor.id}
          playerName={revealFor.name}
          onClose={() => setRevealFor(null)}
        />
      ) : null}
    </>
  );
}

function UserCard({
  user,
  clubs,
  onChanged,
  onReveal,
}: {
  user: ManagedUser;
  clubs: Club[];
  onChanged: () => void;
  onReveal: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  async function patch(body: Record<string, unknown>, message: string) {
    setError(null);
    const result = await call(`/api/founder/users/${user.id}`, { method: "PATCH", body });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStatus(message);
    onChanged();
    setTimeout(() => setStatus(null), 2500);
  }

  async function revokeSessions() {
    const result = await call<{ closed: number }>(`/api/founder/users/${user.id}/sessions`, {
      method: "DELETE",
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStatus(`✓ ${result.data.closed} inloggning(ar) avslutade`);
    onChanged();
  }

  async function remove() {
    const result = await call(
      `/api/founder/users/${user.id}?confirm=${encodeURIComponent(confirm)}`,
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
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold">
            {user.name}
            {!user.isActive ? (
              <span className="mm-tag ml-2 align-middle">Avstängt</span>
            ) : null}
          </h3>
          <p className="text-ink-soft font-mono text-[11.5px]">{user.email}</p>
          <p className="text-ink-soft mt-1 text-[11.5px]">
            {ROLE_LABEL[user.role] ?? user.role}
            {user.clubName ? ` · ${user.clubName}` : ""} · {user.reflectionCount} reflektioner ·{" "}
            {user.lastLoginAt ? `senast inloggad ${formatDate(user.lastLoginAt)}` : "aldrig inloggad"}
          </p>
        </div>
        {status ? <span className="text-ball-dark text-[12px] italic">{status}</span> : null}
      </div>

      <ErrorNote message={error} />

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={user.role}
          onChange={(event) => patch({ role: event.target.value }, "✓ Roll ändrad")}
          className="mm-input w-auto py-1.5 text-[12px]"
        >
          {Object.values(ROLE).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role]}
            </option>
          ))}
        </select>

        {user.role !== ROLE.FOUNDER ? (
          <select
            value={user.clubId ?? ""}
            onChange={(event) => patch({ clubId: event.target.value || null }, "✓ Klubb ändrad")}
            className="mm-input w-auto py-1.5 text-[12px]"
          >
            <option value="">Ingen klubb</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        ) : null}

        <button
          type="button"
          onClick={() => patch({ isActive: !user.isActive }, user.isActive ? "✓ Avstängt" : "✓ Påslaget")}
          className="border-line hover:border-brass rounded-full border px-3.5 py-1.5 text-[12px] font-semibold"
        >
          {user.isActive ? "Stäng av" : "Aktivera"}
        </button>

        <button
          type="button"
          onClick={revokeSessions}
          disabled={user.sessionCount === 0}
          className="border-line hover:border-brass rounded-full border px-3.5 py-1.5 text-[12px] font-semibold disabled:opacity-40"
        >
          Logga ut ({user.sessionCount})
        </button>

        {user.role === ROLE.PLAYER ? (
          <button
            type="button"
            onClick={onReveal}
            className="border-clay text-clay hover:bg-clay-bg rounded-full border px-3.5 py-1.5 text-[12px] font-semibold"
          >
            Break-glass
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setShowDelete((value) => !value)}
          className="text-clay ml-auto text-[12px] underline"
        >
          Radera
        </button>
      </div>

      {showDelete ? (
        <div className="bg-clay-bg border-clay mt-3 rounded-lg border px-4 py-3">
          <p className="text-clay-dark mb-2 text-[12.5px] leading-relaxed">
            Raderar kontot och all dess data permanent. Vill du bara spärra åtkomsten, använd
            <strong> Stäng av</strong> i stället. Skriv{" "}
            <strong className="font-mono">{user.email}</strong> för att bekräfta.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="mm-input flex-1 min-w-[180px]"
              placeholder={user.email}
            />
            <button
              type="button"
              onClick={remove}
              disabled={confirm !== user.email}
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
