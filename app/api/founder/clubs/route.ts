import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireFounder } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { AUDIT, ROLE } from "@/lib/constants";

export async function GET() {
  try {
    await requireFounder();
    const clubs = await prisma.club.findMany({
      include: {
        users: { select: { role: true, isActive: true } },
        teamPlans: { select: { text: true, updatedAt: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      clubs: clubs.map((club) => ({
        id: club.id,
        name: club.name,
        createdAt: club.createdAt.toISOString(),
        coaches: club.users.filter((user) => user.role === ROLE.COACH && user.isActive).length,
        players: club.users.filter((user) => user.role === ROLE.PLAYER && user.isActive).length,
        teamPlan: club.teamPlans[0]?.text ?? null,
        teamPlanUpdatedAt: club.teamPlans[0]?.updatedAt.toISOString() ?? null,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const founder = await requireFounder();
    const { name } = await readJson<{ name?: string }>(request);
    const trimmed = name?.trim();
    if (!trimmed) throw new ApiError(400, "Klubbnamn krävs");

    const club = await prisma.club.create({ data: { name: trimmed } });
    await writeAudit(founder, {
      action: AUDIT.CLUB_CREATED,
      targetType: "Club",
      targetId: club.id,
      meta: { name: club.name },
    });

    return NextResponse.json({ club: { id: club.id, name: club.name } });
  } catch (error) {
    return apiError(error);
  }
}
