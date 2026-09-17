"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="rounded-full border border-[rgba(255,255,255,0.18)] px-4 py-1.5 text-[12px] font-semibold text-[#c9d3cb] transition hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-50"
    >
      {busy ? "Loggar ut…" : "Logga ut"}
    </button>
  );
}
