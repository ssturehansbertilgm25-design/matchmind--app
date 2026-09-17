import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { HOME_FOR_ROLE, ROLE } from "@/lib/constants";
import { isMockMode } from "@/lib/ai";
import { Topbar } from "@/components/Topbar";
import { FounderConsole } from "@/components/founder/FounderConsole";

export default async function FounderPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== ROLE.FOUNDER) redirect(HOME_FOR_ROLE[user.role] ?? "/login");

  return (
    <div className="min-h-dvh">
      <Topbar subtitle="founder — hela appen" demoMode={isMockMode()} />
      <main className="mx-auto max-w-[1100px] px-5 py-7 sm:px-7">
        <div className="mb-5">
          <h1 className="font-display text-[26px] leading-tight">Hej {user.name.split(" ")[0]}</h1>
          <p className="font-display text-ink-soft text-[14.5px] italic">
            Du styr klubbar, konton och inbjudningar. Reflektionstext är spelarens — den kan bara
            öppnas med ett angivet skäl, och varje gång hamnar i granskningsloggen.
          </p>
        </div>
        <FounderConsole />
      </main>
    </div>
  );
}
