import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ROLE } from "@/lib/constants";
import { isMockMode } from "@/lib/ai";
import { buildWeeklyDigest, clubStats, getClubPlayers, sortByAttention } from "@/lib/players";
import { Topbar } from "@/components/Topbar";
import { CoachDashboard } from "@/components/coach/CoachDashboard";

export default async function CoachPage() {
  // Rollkontrollen sker server-side, precis som i API-routarna.
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== ROLE.COACH) redirect("/player");

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
