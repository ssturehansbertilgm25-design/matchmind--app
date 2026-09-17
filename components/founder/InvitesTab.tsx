"use client";

import { useEffect, useState } from "react";
import { ROLE, ROLE_LABEL } from "@/lib/constants";
import { call, formatDate } from "./api";
import { ErrorNote, Loading, Panel, type Club } from "./FounderConsole";

type Invite = {
  id: string;
  email: string;
  role: string;
  name: string | null;
  clubName: string | null;
  status: "open" | "accepted" | "revoked" | "expired";
  createdAt: string;
  expiresAt: string;
  createdBy: string;
};

const STATUS_LABEL: Record<Invite["status"], string> = {
  open: "Väntar",
  accepted: "Använd",
  revoked: "Återkallad",
  expired: "Utgången",
};

export function InvitesTab({ clubs }: { clubs: Club[] }) {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>(ROLE.PLAYER);
  const [clubId, setClubId] = useState("");
  const [level, setLevel] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    const result = await call<{ invites: Invite[] }>("/api/invites");
    if (result.ok) setInvites(result.data.invites);
    else setError(result.error);
  }

  useEffect(() => {
    call<{ invites: Invite[] }>("/api/invites").then((result) => {
      if (result.ok) setInvites(result.data.invites);
      else setError(result.error);
    });
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setLink(null);

    const result = await call<{ invite: { url: string } }>("/api/invites", {
      method: "POST",
      body: {
        email,
        role,
        clubId: role === ROLE.FOUNDER ? null : clubId || null,
        name: name || null,
        level: level || null,
      },
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setLink(result.data.invite.url);
    setEmail("");
    setName("");
    setLevel("");
    void load();
  }

  async function revoke(id: string) {
    const result = await call(`/api/invites/${id}`, { method: "DELETE" });
    if (!result.ok) setError(result.error);
    void load();
  }

  return (
    <>
      <Panel>
        <h2 className="font-display mb-1 text-[18px]">Bjud in</h2>
        <p className="text-ink-soft mb-3 text-[12.5px] leading-relaxed">
          Konton kan bara skapas via en inbjudningslänk. Länken visas en enda gång här — kopiera
          den och skicka den till personen på det sätt du föredrar.
        </p>

        <ErrorNote message={error} />

        <form onSubmit={create} className="flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="E-postadress"
              className="mm-input flex-1 min-w-[200px]"
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="mm-input w-auto"
            >
              {Object.values(ROLE).map((item) => (
                <option key={item} value={item}>
                  {ROLE_LABEL[item]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Namn (valfritt, förifylls)"
              className="mm-input flex-1 min-w-[180px]"
            />
            {role !== ROLE.FOUNDER ? (
              <select
                required
                value={clubId}
                onChange={(event) => setClubId(event.target.value)}
                className="mm-input w-auto"
              >
                <option value="">Välj klubb…</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {role === ROLE.PLAYER ? (
            <input
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              placeholder="Nivå, t.ex. Tävling, regionnivå (valfritt)"
              className="mm-input"
            />
          ) : null}

          <button type="submit" disabled={busy} className="mm-btn-primary mt-1">
            {busy ? "Skapar länk…" : "Skapa inbjudningslänk"}
          </button>
        </form>

        {link ? (
          <div className="bg-court-bg border-court mt-3 rounded-lg border px-4 py-3">
            <p className="text-court-dark mb-2 text-[12px] font-semibold">
              Länken visas bara nu — kopiera den innan du lämnar sidan.
            </p>
            <div className="flex flex-wrap gap-2">
              <input readOnly value={link} className="mm-input flex-1 min-w-[200px] font-mono text-[11.5px]" />
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="mm-btn-ball px-4"
              >
                {copied ? "Kopierad ✓" : "Kopiera"}
              </button>
            </div>
          </div>
        ) : null}
      </Panel>

      <div className="mt-4">
        {!invites ? <Loading /> : null}
        {invites?.length === 0 ? (
          <p className="text-ink-soft text-[13px] italic">Inga inbjudningar ännu.</p>
        ) : null}
        <div className="flex flex-col gap-2">
          {invites?.map((invite) => (
            <div
              key={invite.id}
              className="mm-card flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <div>
                <p className="text-[13.5px] font-semibold">{invite.email}</p>
                <p className="text-ink-soft text-[11.5px]">
                  {ROLE_LABEL[invite.role] ?? invite.role}
                  {invite.clubName ? ` · ${invite.clubName}` : ""} · skapad{" "}
                  {formatDate(invite.createdAt)} av {invite.createdBy}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`mm-tag ${
                    invite.status === "open"
                      ? "bg-court-bg text-court-dark"
                      : invite.status === "accepted"
                        ? ""
                        : "bg-amber-bg text-amber-dark"
                  }`}
                >
                  {STATUS_LABEL[invite.status]}
                </span>
                {invite.status === "open" ? (
                  <button
                    type="button"
                    onClick={() => revoke(invite.id)}
                    className="text-clay text-[12px] underline"
                  >
                    Återkalla
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
