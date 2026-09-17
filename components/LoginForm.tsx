"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const DEMO_ACCOUNTS = [
  {
    label: "Tränare",
    name: "Johan Wide",
    email: "coach@matchmind.se",
    description: "Ser hela truppen — sammanställd, aldrig råtext",
  },
  {
    label: "Spelare",
    name: "Emma Lindqvist",
    email: "emma@matchmind.se",
    description: "Reflektion, sparring och övningar",
  },
];
const DEMO_PASSWORD = "demo1234";

export function LoginForm({ demoMode }: { demoMode: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Inloggningen misslyckades");
      setBusy(false);
      return;
    }
    // Rollen avgör landningssidan, och den bestäms server-side.
    router.replace(data.redirectTo);
    router.refresh();
  }

  return (
    <div className="mm-card p-6">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="mm-label">E-post</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mm-input"
            placeholder="namn@matchmind.se"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mm-label">Lösenord</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mm-input"
            placeholder="••••••••"
          />
        </label>

        {error ? (
          <p className="bg-clay-bg text-clay-dark border-clay rounded-lg border px-3 py-2 text-[12.5px]">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={busy} className="mm-btn-primary mt-1">
          {busy ? "Loggar in…" : "Logga in"}
        </button>
      </form>

      <div className="border-line mt-6 border-t pt-5">
        <p className="mm-label mb-3">Demokonton — klicka för att fylla i</p>
        <div className="flex flex-col gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => {
                setEmail(account.email);
                setPassword(DEMO_PASSWORD);
                setError(null);
              }}
              className="border-line hover:border-brass flex flex-col items-start rounded-lg border px-3.5 py-2.5 text-left transition"
            >
              <span className="text-[13px] font-semibold">
                {account.label} · {account.name}
              </span>
              <span className="text-ink-soft font-mono text-[11.5px]">
                {account.email} / {DEMO_PASSWORD}
              </span>
              <span className="text-ink-soft mt-0.5 text-[11.5px]">{account.description}</span>
            </button>
          ))}
        </div>
        {demoMode ? (
          <p className="text-ink-soft mt-4 text-[11.5px] italic">
            AI:n körs i demoläge (MOCK_AI) — svaren är deterministiska exempelsvar.
          </p>
        ) : null}
      </div>
    </div>
  );
}
