import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireRole, requirePlayerInScope } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";
import { INTENSITY, MUSCLE_GROUPS, ROLE } from "@/lib/constants";

type Entry = {
  weekday: number;
  time?: string | null;
  focus?: string;
  muscleGroup?: string | null;
  intensity?: string;
};

/**
 * Veckoschemat styr belastningskollen (lib/load.ts), så det måste gå att hålla aktuellt.
 * Hela veckan skickas in på en gång och ersätter den gamla.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(ROLE.COACH, ROLE.FOUNDER);
    const { id } = await params;
    await requirePlayerInScope(actor, id);

    const { entries } = await readJson<{ entries?: Entry[] }>(request);
    if (!Array.isArray(entries)) throw new ApiError(400, "Schemat saknas");

    const cleaned = entries.map((entry) => {
      const weekday = Number(entry.weekday);
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        throw new ApiError(400, "Veckodag måste vara 0–6");
      }
      const intensity = entry.intensity ?? INTENSITY.REST;
      if (!Object.values(INTENSITY).includes(intensity as never)) {
        throw new ApiError(400, `Okänd belastning: ${intensity}`);
      }
      const muscleGroup = entry.muscleGroup?.trim() || null;
      if (muscleGroup && !MUSCLE_GROUPS.includes(muscleGroup as never)) {
        throw new ApiError(400, `Okänd muskelgrupp: ${muscleGroup}`);
      }
      return {
        weekday,
        time: entry.time?.trim() || null,
        focus: entry.focus?.trim() || "Vila",
        muscleGroup,
        intensity,
      };
    });

    await prisma.$transaction(
      cleaned.map((entry) =>
        prisma.scheduleEntry.upsert({
          where: { playerId_weekday: { playerId: id, weekday: entry.weekday } },
          update: entry,
          create: { playerId: id, ...entry },
        }),
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
