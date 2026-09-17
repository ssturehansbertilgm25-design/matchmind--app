import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { HOME_FOR_ROLE, ROLE } from "@/lib/constants";
import { isMockMode } from "@/lib/ai";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(HOME_FOR_ROLE[user.role] ?? "/");

  // Innan founder-kontot finns är setupen enda vägen in.
  const founderCount = await prisma.user.count({ where: { role: ROLE.FOUNDER } });
  if (founderCount === 0) redirect("/setup");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-7 text-center">
          <span className="font-display text-court-dark mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-[var(--brass)] text-[24px] italic">
            M
          </span>
          <h1 className="font-display text-court-dark text-[32px] leading-tight">MatchMind</h1>
          <p className="font-display text-ink-soft text-[15px] italic">
            mental träning &amp; spelarengagemang
          </p>
        </div>

        <LoginForm demoMode={isMockMode()} />

        <p className="text-ink-soft mt-6 text-center text-[11.5px] leading-relaxed">
          Reflektionerna är spelarens egna. Tränaren ser sammanställd information —
          aldrig råtext som spelaren inte valt att dela.
        </p>
      </div>
    </main>
  );
}
