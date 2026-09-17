import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { DAYS, ROLE } from "@/lib/constants";
import { isMockMode } from "@/lib/ai";
import { Topbar } from "@/components/Topbar";
import { PlayerApp } from "@/components/player/PlayerApp";

function todayWeekday(): number {
  return (new Date().getDay() + 6) % 7;
}

export default async function PlayerPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== ROLE.PLAYER) redirect("/coach");

  const [reflections, schedule, clubmates, messages] = await Promise.all([
    prisma.reflection.findMany({
      where: { playerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.scheduleEntry.findMany({ where: { playerId: user.id }, orderBy: { weekday: "asc" } }),
    prisma.user.findMany({
      where: { clubId: user.clubId, role: ROLE.PLAYER, id: { not: user.id } },
      include: { profile: true },
      orderBy: { name: "asc" },
    }),
    prisma.message.findMany({
      where: { OR: [{ fromUserId: user.id }, { toUserId: user.id }] },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const lastMessageByPartner = new Map<string, string>();
  for (const message of messages) {
    const partnerId = message.fromUserId === user.id ? message.toUserId : message.fromUserId;
    if (!lastMessageByPartner.has(partnerId)) lastMessageByPartner.set(partnerId, message.text);
  }

  const today = schedule.find((entry) => entry.weekday === todayWeekday()) ?? null;
  const lastTag = reflections.find((reflection) => reflection.tag)?.tag ?? null;

  return (
    <div className="min-h-dvh">
      <Topbar subtitle="din mentala träning" demoMode={isMockMode()} />
      <main className="mx-auto max-w-[480px] px-4 py-6">
        <PlayerApp
          name={user.name}
          todayFocus={
            today ? `${DAYS[today.weekday]}: ${today.focus}${today.time ? ` kl ${today.time}` : ""}` : null
          }
          lastTag={lastTag}
          history={reflections.map((reflection) => ({
            id: reflection.id,
            createdAt: reflection.createdAt.toISOString(),
            mood: reflection.mood,
            tag: reflection.tag,
            text: reflection.text,
          }))}
          clubmates={clubmates.map((mate) => ({
            id: mate.id,
            name: mate.name,
            level: mate.profile?.level ?? "",
            preview: lastMessageByPartner.get(mate.id) ?? null,
          }))}
          todayWeekday={todayWeekday()}
        />
      </main>
    </div>
  );
}
