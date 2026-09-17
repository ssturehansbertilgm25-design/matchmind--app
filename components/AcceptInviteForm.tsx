"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

export function AcceptInviteForm({
  token,
  defaultName,
  isPlayer,
}: {
  token: string;
  defaultName: string;
  isPlayer: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [birthYear, setBirthYear] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== repeat) {
      setError("Lösenorden matchar inte");
      return;
    }
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/invite/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        password,
        birthYear: birthYear ? Number(birthYear) : undefined,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Kunde inte skapa kontot");
      setBusy(false);
      return;
    }
    router.replace(data.redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mm-card flex flex-col gap-4 p-6">
      <label className="flex flex-col gap-1.5">
        <span className="mm-label">Ditt namn</span>
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mm-input"
          placeholder="För- och efternamn"
        />
      </label>

      {isPlayer ? (
        <label className="flex flex-col gap-1.5">
          <span className="mm-label">Födelseår</span>
          <input
            type="number"
            min={1950}
            max={new Date().getFullYear()}
            value={birthYear}
            onChange={(event) => setBirthYear(event.target.value)}
            className="mm-input"
            placeholder="t.ex. 2010"
          />
        </label>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="mm-label">Välj lösenord</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mm-input"
          placeholder={`Minst ${MIN_PASSWORD_LENGTH} tecken`}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="mm-label">Upprepa lösenord</span>
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

      <button type="submit" disabled={busy} className="mm-btn-primary mt-1">
        {busy ? "Skapar konto…" : "Skapa mitt konto"}
      </button>
    </form>
  );
}
