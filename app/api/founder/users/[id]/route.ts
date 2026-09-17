import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, destroyAllSessions, requireFounder } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { AUDIT, ROLE, type Role } from "@/lib/constants";

/** Hindrar att den sista foundern råkar tas bort eller degraderas. */
async function assertNotLastFounder(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.role !== ROLE.FOUNDER) return;
  const activeFounders = await prisma.user.count({
    where: { role: ROLE.FOUNDER, isActive: true, id: { not: userId } },
  });
  if (activeFounders === 0) {
    throw new ApiError(400, "Det måste finnas minst en aktiv founder — bjud in en till först");
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const founder = await requireFounder();
    const { id } = await params;
    const body = await readJson<{ role?: Role; clubId?: string | null; isActive?: boolean }>(
      request,
    );

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, "Kontot finns inte");

    if (body.role && body.role !== user.role) {
      if (!Object.values(ROLE).includes(body.role)) throw new ApiError(400, "Okänd roll");
      await assertNotLastFounder(id);

      // En spelare behöver en profil; en founder ska inte ligga i en klubb.
      const clubId = body.role === ROLE.FOUNDER ? null : (body.clubId ?? user.clubId);
      if (body.role !== ROLE.FOUNDER && !clubId) {
        throw new ApiError(400, "Tränare och spelare måste tillhöra en klubb");
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id }, data: { role: body.role!, clubId } });
        if (body.role === ROLE.PLAYER) {
          const profile = await tx.playerProfile.findUnique({ where: { userId: id } });
          if (!profile) {
            await tx.playerProfile.create({
              data: {
                userId: id,
                level: "Klubbnivå",
                birthYear: new Date().getFullYear() - 16,
                trainingAttendance: 0,
              },
            });
          }
        }
      });

      await writeAudit(founder, {
        action: AUDIT.USER_ROLE_CHANGED,
        targetType: "User",
        targetId: id,
        meta: { email: user.email, from: user.role, to: body.role },
      });
    } else if (body.clubId !== undefined && body.clubId !== user.clubId) {
      if (user.role !== ROLE.FOUNDER && !body.clubId) {
        throw new ApiError(400, "Tränare och spelare måste tillhöra en klubb");
      }
      await prisma.user.update({ where: { id }, data: { clubId: body.clubId } });
      await writeAudit(founder, {
        action: AUDIT.USER_CLUB_CHANGED,
        targetType: "User",
        targetId: id,
        meta: { email: user.email, from: user.clubId, to: body.clubId },
      });
    }

    if (body.isActive !== undefined && body.isActive !== user.isActive) {
      if (!body.isActive) {
        await assertNotLastFounder(id);
        // Avstängning ska slå igenom direkt, inte när sessionen råkar gå ut.
        await destroyAllSessions(id);
      }
      await prisma.user.update({ where: { id }, data: { isActive: body.isActive } });
      await writeAudit(founder, {
        action: body.isActive ? AUDIT.USER_REACTIVATED : AUDIT.USER_DEACTIVATED,
        targetType: "User",
        targetId: id,
        meta: { email: user.email },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const founder = await requireFounder();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { reflections: true } } },
    });
    if (!user) throw new ApiError(404, "Kontot finns inte");
    if (user.id === founder.id) throw new ApiError(400, "Du kan inte radera ditt eget konto");
    await assertNotLastFounder(id);

    const url = new URL(request.url);
    if (url.searchParams.get("confirm") !== user.email) {
      throw new ApiError(400, "Skriv kontots e-postadress för att bekräfta raderingen");
    }

    await prisma.user.delete({ where: { id } });
    await writeAudit(founder, {
      action: AUDIT.USER_DELETED,
      targetType: "User",
      targetId: id,
      meta: { email: user.email, role: user.role, reflectionCount: user._count.reflections },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
