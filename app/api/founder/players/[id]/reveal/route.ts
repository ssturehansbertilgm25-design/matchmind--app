import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireFounder } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";
import { MIN_BREAK_GLASS_REASON, revealReflectionText } from "@/lib/audit";
import { ROLE } from "@/lib/constants";

/**
 * Break-glass: enda vägen för en founder till en spelares reflektionstext.
 *
 * Kräver ett skrivet skäl och loggas i AuditLog, som appen aldrig raderar. Spelaren kan
 * se loggen om hen frågar — det är förutsättningen för att löftet i spelarvyn ska hålla.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const founder = await requireFounder();
    const { id } = await params;
    const { reason } = await readJson<{ reason?: string }>(request);

    const trimmed = reason?.trim() ?? "";
    if (trimmed.length < MIN_BREAK_GLASS_REASON) {
      throw new ApiError(
        400,
        `Skriv ett skäl på minst ${MIN_BREAK_GLASS_REASON} tecken — det sparas i granskningsloggen`,
      );
    }

    const player = await prisma.user.findFirst({ where: { id, role: ROLE.PLAYER } });
    if (!player) throw new ApiError(404, "Spelaren finns inte");

    const reflections = await revealReflectionText(founder, id, trimmed);

    return NextResponse.json({
      playerName: player.name,
      loggedAs: founder.email,
      reflections: reflections.map((reflection) => ({
        id: reflection.id,
        createdAt: reflection.createdAt.toISOString(),
        mood: reflection.mood,
        tag: reflection.tag,
        text: reflection.text,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
