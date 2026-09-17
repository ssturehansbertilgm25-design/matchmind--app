import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireRole } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { AUDIT, ROLE } from "@/lib/constants";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(ROLE.FOUNDER, ROLE.COACH);
    const { id } = await params;

    const invite = await prisma.invite.findUnique({ where: { id } });
    if (!invite) throw new ApiError(404, "Inbjudan finns inte");
    if (actor.role === ROLE.COACH && invite.clubId !== actor.clubId) {
      throw new ApiError(403, "Inbjudan tillhör en annan klubb");
    }
    if (invite.acceptedAt) throw new ApiError(400, "Inbjudan är redan använd");

    await prisma.invite.update({ where: { id }, data: { revokedAt: new Date() } });
    await writeAudit(actor, {
      action: AUDIT.INVITE_REVOKED,
      targetType: "Invite",
      targetId: id,
      meta: { email: invite.email },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
