"use client";

import { useState } from "react";

/** Tränaren bjuder in spelare till sin egen klubb. Länken visas en enda gång. */
export function InvitePlayerCard() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setLink(null);

    const response = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: "PLAYER", name: name || null, level: level || null }),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(data.error ?? "Kunde inte skapa inbjudan");
      return;
    }
    setLink(data.invite.url);
    setEmail("");
    setName("");
    setLevel("");
  }

  return (
    <section className="mm-card mb-6 p-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="font-display block text-[18px]">Bjud in en spelare</span>
          <span className="text-ink-soft block text-[12.5px]">
            Spelaren får en länk och väljer sitt eget lösenord
          </span>
        </span>
        <span className="text-ink-soft font-mono text-[11px]">{open ? "dölj ▴" : "visa ▾"}</span>
      </button>

      {open ? (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Spelarens e-post"
              className="mm-input flex-1 min-w-[200px]"
            />
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Namn (valfritt)"
              className="mm-input flex-1 min-w-[160px]"
            />
          </div>
          <input
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            placeholder="Nivå, t.ex. Tävling, regionnivå (valfritt)"
            className="mm-input"
          />

          {error ? (
            <p className="bg-clay-bg text-clay-dark border-clay rounded-lg border px-3 py-2 text-[12.5px]">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={busy} className="mm-btn-ball self-start px-5">
            {busy ? "Skapar länk…" : "Skapa inbjudningslänk"}
          </button>

          {link ? (
            <div className="bg-court-bg border-court rounded-lg border px-4 py-3">
              <p className="text-court-dark mb-2 text-[12px] font-semibold">
                Kopiera länken nu — den visas bara den här gången.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  readOnly
                  value={link}
                  className="mm-input flex-1 min-w-[200px] font-mono text-[11.5px]"
                />
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
        </form>
      ) : null}
    </section>
  );
}
