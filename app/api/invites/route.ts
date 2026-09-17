import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireRole } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";
import { createInvite, inviteStatus } from "@/lib/invites";
import { writeAudit } from "@/lib/audit";
import { AUDIT, ROLE, type Role } from "@/lib/constants";

export async function GET() {
  try {
    const actor = await requireRole(ROLE.FOUNDER, ROLE.COACH);

    const invites = await prisma.invite.findMany({
      // Tränare ser bara sin egen klubbs inbjudningar.
      where: actor.role === ROLE.FOUNDER ? {} : { clubId: actor.clubId ?? "__ingen__" },
      include: { club: true, createdBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      invites: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        name: invite.name,
        clubName: invite.club?.name ?? null,
        status: inviteStatus(invite),
        createdAt: invite.createdAt.toISOString(),
        expiresAt: invite.expiresAt.toISOString(),
        createdBy: invite.createdBy.name,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRole(ROLE.FOUNDER, ROLE.COACH);
    const body = await readJson<{
      email?: string;
      role?: string;
      clubId?: string | null;
      name?: string;
      level?: string;
      birthYear?: number;
    }>(request);

    if (!body.email) throw new ApiError(400, "E-postadress krävs");
    const role = (body.role ?? ROLE.PLAYER) as Role;
    if (!Object.values(ROLE).includes(role)) throw new ApiError(400, "Okänd roll");

    const invite = await createInvite(actor, {
      email: body.email,
      role,
      clubId: body.clubId ?? null,
      name: body.name ?? null,
      level: body.level ?? null,
      birthYear: body.birthYear ?? null,
    });

    await writeAudit(actor, {
      action: AUDIT.INVITE_CREATED,
      targetType: "Invite",
      targetId: invite.id,
      meta: { email: invite.email, role: invite.role },
    });

    // Länken visas en enda gång — den går inte att hämta igen efteråt.
    return NextResponse.json({ invite });
  } catch (error) {
    return apiError(error);
  }
}
