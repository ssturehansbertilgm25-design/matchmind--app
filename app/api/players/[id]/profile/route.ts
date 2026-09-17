import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireRole, requirePlayerInScope } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";
import { ROLE } from "@/lib/constants";

type Body = {
  name?: string;
  level?: string;
  birthYear?: number;
  guardianEmail?: string | null;
  guardianConsent?: boolean;
  trainingAttendance?: number;
};

/** Tränaren håller spelarens uppgifter aktuella: nivå, närvaro och målsmans kontakt. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(ROLE.COACH, ROLE.FOUNDER);
    const { id } = await params;
    await requirePlayerInScope(actor, id);

    const body = await readJson<Body>(request);

    if (body.trainingAttendance !== undefined) {
      const value = Number(body.trainingAttendance);
      if (!Number.isInteger(value) || value < 0 || value > 100) {
        throw new ApiError(400, "Träningsnärvaro anges som ett heltal 0–100");
      }
    }
    if (body.birthYear !== undefined) {
      const year = Number(body.birthYear);
      const now = new Date().getFullYear();
      if (!Number.isInteger(year) || year < 1950 || year > now) {
        throw new ApiError(400, "Ogiltigt födelseår");
      }
    }

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new ApiError(400, "Namn krävs");
      await prisma.user.update({ where: { id }, data: { name } });
    }

    const profileData = {
      ...(body.level !== undefined ? { level: body.level.trim() || "Klubbnivå" } : {}),
      ...(body.birthYear !== undefined ? { birthYear: Number(body.birthYear) } : {}),
      ...(body.guardianEmail !== undefined
        ? { guardianEmail: body.guardianEmail?.trim() || null }
        : {}),
      ...(body.guardianConsent !== undefined ? { guardianConsent: body.guardianConsent } : {}),
      ...(body.trainingAttendance !== undefined
        ? { trainingAttendance: Number(body.trainingAttendance) }
        : {}),
    };

    if (Object.keys(profileData).length > 0) {
      await prisma.playerProfile.upsert({
        where: { userId: id },
        update: profileData,
        create: {
          userId: id,
          level: profileData.level ?? "Klubbnivå",
          birthYear: profileData.birthYear ?? new Date().getFullYear() - 16,
          guardianEmail: profileData.guardianEmail ?? null,
          guardianConsent: profileData.guardianConsent ?? false,
          trainingAttendance: profileData.trainingAttendance ?? 0,
          coachId: actor.role === ROLE.COACH ? actor.id : null,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
