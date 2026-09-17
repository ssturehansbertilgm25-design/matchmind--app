import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireRole } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { AUDIT, ROLE } from "@/lib/constants";

/** Markerar en flagga som åtgärdad. Tränaren når bara sin egen klubbs flaggor. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(ROLE.FOUNDER, ROLE.COACH);
    const { id } = await params;

    const flag = await prisma.flag.findUnique({ where: { id }, include: { player: true } });
    if (!flag) throw new ApiError(404, "Flaggan finns inte");
    if (actor.role === ROLE.COACH && flag.player.clubId !== actor.clubId) {
      throw new ApiError(403, "Flaggan tillhör en annan klubb");
    }
    if (flag.resolvedAt) return NextResponse.json({ ok: true, alreadyResolved: true });

    await prisma.flag.update({
      where: { id },
      data: { resolvedAt: new Date(), resolvedBy: actor.id },
    });
    await writeAudit(actor, {
      action: AUDIT.FLAG_RESOLVED,
      targetType: "Flag",
      targetId: id,
      meta: { type: flag.type, playerId: flag.playerId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
