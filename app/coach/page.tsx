import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { HOME_FOR_ROLE, ROLE } from "@/lib/constants";
import { isMockMode } from "@/lib/ai";
import { buildWeeklyDigest, clubStats, getClubPlayers, sortByAttention } from "@/lib/players";
import { Topbar } from "@/components/Topbar";
import { CoachDashboard } from "@/components/coach/CoachDashboard";

export default async function CoachPage() {
  // Rollkontrollen sker server-side, precis som i API-routarna.
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== ROLE.COACH) redirect(HOME_FOR_ROLE[user.role] ?? "/login");

  if (!user.clubId) {
    return (
      <div className="min-h-dvh">
        <Topbar subtitle="tränarvy" demoMode={isMockMode()} />
        <main className="mx-auto max-w-[600px] px-5 py-10">
          <div className="mm-card p-6">
            <h1 className="font-display mb-2 text-[22px]">Ditt konto saknar klubb</h1>
            <p className="text-ink-soft text-[13.5px] leading-relaxed">
              Tränarkonton måste kopplas till en klubb innan de kan användas. Be en founder
              koppla ditt konto till rätt klubb, så dyker truppen upp här.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const [players, teamPlan, club] = await Promise.all([
    getClubPlayers(user.clubId),
    prisma.teamPlan.findUnique({ where: { clubId: user.clubId } }),
    prisma.club.findUnique({ where: { id: user.clubId } }),
  ]);

  return (
    <div className="min-h-dvh">
      <Topbar subtitle={club?.name ?? "tränarvy"} demoMode={isMockMode()} />
      <main className="mx-auto max-w-[1100px] px-5 py-7 sm:px-7">
        <CoachDashboard
          coachName={user.name}
          players={sortByAttention(players)}
          stats={clubStats(players)}
          digest={buildWeeklyDigest(players)}
          teamPlan={teamPlan?.text ?? ""}
        />
      </main>
    </div>
  );
}
