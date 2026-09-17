import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ROLE } from "@/lib/constants";
import { SetupForm } from "@/components/SetupForm";

export default async function SetupPage() {
  // Setupen finns bara så länge det inte finns någon founder.
  const founderCount = await prisma.user.count({ where: { role: ROLE.FOUNDER } });
  if (founderCount > 0) redirect("/login");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[460px]">
        <div className="mb-7 text-center">
          <span className="font-display text-court-dark mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-[var(--brass)] text-[24px] italic">
            M
          </span>
          <h1 className="font-display text-court-dark text-[30px] leading-tight">
            Sätt upp MatchMind
          </h1>
          <p className="font-display text-ink-soft text-[15px] italic">
            Skapa founder-kontot — det som styr hela appen
          </p>
        </div>

        <SetupForm requiresToken={Boolean(process.env.SETUP_TOKEN)} />

        <p className="text-ink-soft mt-6 text-center text-[11.5px] leading-relaxed">
          Den här sidan stängs permanent så fort kontot är skapat. Därefter skapas alla konton
          via inbjudningslänkar från founder-vyn.
        </p>
      </div>
    </main>
  );
}
