"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
            placeholder="namn@klubben.se"
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

      <p className="text-ink-soft border-line mt-5 border-t pt-4 text-[11.5px] leading-relaxed">
        Konton skapas via en inbjudningslänk från din klubb — det går inte att registrera sig
        själv. Har du ingen länk, be din tränare eller klubbansvarig skicka en.
        {demoMode ? " AI:n körs just nu i demoläge." : ""}
      </p>
    </div>
  );
}
