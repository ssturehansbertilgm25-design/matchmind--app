import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { ROLE } from "@/lib/constants";

/** Öppna flaggor. Tränaren ser sin klubb, foundern ser alla. Aldrig med reflektionstext. */
export async function GET() {
  try {
    const actor = await requireRole(ROLE.FOUNDER, ROLE.COACH);

    const flags = await prisma.flag.findMany({
      where: {
        resolvedAt: null,
        ...(actor.role === ROLE.COACH ? { player: { clubId: actor.clubId ?? "__ingen__" } } : {}),
      },
      include: { player: { select: { id: true, name: true, club: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      flags: flags.map((flag) => ({
        id: flag.id,
        type: flag.type,
        reason: flag.reason,
        createdAt: flag.createdAt.toISOString(),
        playerId: flag.player.id,
        playerName: flag.player.name,
        clubName: flag.player.club?.name ?? null,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
