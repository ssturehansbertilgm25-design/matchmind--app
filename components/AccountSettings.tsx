"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

export function AccountSettings() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (next !== repeat) {
      setError("De nya lösenorden matchar inte");
      return;
    }
    setStatus("saving");
    setError(null);

    const response = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Kunde inte byta lösenord");
      setStatus("idle");
      return;
    }
    setCurrent("");
    setNext("");
    setRepeat("");
    setStatus("saved");
    router.refresh();
  }

  async function logoutEverywhere() {
    await fetch("/api/account/sessions", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <section className="mm-card mb-5 p-5">
        <h2 className="font-display mb-3 text-[18px]">Byt lösenord</h2>
        <form onSubmit={changePassword} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="mm-label">Nuvarande lösenord</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              className="mm-input"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="mm-label">Nytt lösenord</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              className="mm-input"
              placeholder={`Minst ${MIN_PASSWORD_LENGTH} tecken`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="mm-label">Upprepa nytt lösenord</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={repeat}
              onChange={(event) => setRepeat(event.target.value)}
              className="mm-input"
            />
          </label>

          {error ? (
            <p className="bg-clay-bg text-clay-dark border-clay rounded-lg border px-3 py-2 text-[12.5px]">
              {error}
            </p>
          ) : null}
          {status === "saved" ? (
            <p className="bg-court-bg border-court text-court-dark rounded-lg border px-3 py-2 text-[12.5px]">
              ✓ Lösenordet är bytt. Andra enheter har loggats ut.
            </p>
          ) : null}

          <button type="submit" disabled={status === "saving"} className="mm-btn-primary mt-1">
            {status === "saving" ? "Byter…" : "Byt lösenord"}
          </button>
        </form>
      </section>

      <section className="mm-card p-5">
        <h2 className="font-display mb-2 text-[18px]">Din data</h2>
        <p className="text-ink-soft mb-3 text-[12.5px] leading-relaxed">
          Exporten innehåller allt appen lagrar om dig, inklusive dina egna reflektionstexter.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/account/export"
            className="border-brass text-brass hover:bg-[var(--brass-wash)] rounded-full border-[1.5px] px-4 py-2 text-[12px] font-semibold"
          >
            Ladda ner min data
          </a>
          <button
            type="button"
            onClick={logoutEverywhere}
            className="border-line text-ink-soft hover:border-clay rounded-full border px-4 py-2 text-[12px] font-semibold"
          >
            Logga ut på alla enheter
          </button>
        </div>
      </section>
    </>
  );
}
