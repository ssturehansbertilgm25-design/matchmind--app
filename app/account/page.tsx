import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { HOME_FOR_ROLE, ROLE_LABEL } from "@/lib/constants";
import { isMockMode } from "@/lib/ai";
import { Topbar } from "@/components/Topbar";
import { AccountSettings } from "@/components/AccountSettings";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [club, sessionCount] = await Promise.all([
    user.clubId ? prisma.club.findUnique({ where: { id: user.clubId } }) : Promise.resolve(null),
    prisma.session.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="min-h-dvh">
      <Topbar subtitle="ditt konto" demoMode={isMockMode()} />
      <main className="mx-auto max-w-[560px] px-5 py-7">
        <Link
          href={HOME_FOR_ROLE[user.role] ?? "/"}
          className="text-ink-soft mb-4 inline-block text-[12.5px]"
        >
          ← Tillbaka
        </Link>

        <h1 className="font-display mb-1 text-[26px] leading-tight">Ditt konto</h1>
        <p className="font-display text-ink-soft mb-5 text-[14.5px] italic">
          {ROLE_LABEL[user.role]}
          {club ? ` · ${club.name}` : ""}
        </p>

        <div className="mm-card mb-5 px-5 py-4">
          <dl className="flex flex-col gap-2 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Namn</dt>
              <dd>{user.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">E-post</dt>
              <dd className="font-mono text-[12px]">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Aktiva inloggningar</dt>
              <dd>{sessionCount}</dd>
            </div>
          </dl>
        </div>

        <AccountSettings />
      </main>
    </div>
  );
}
