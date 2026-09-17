import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, SESSION_COOKIE, createSession, hashPassword } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";
import { findUsableInvite } from "@/lib/invites";
import { checkPassword } from "@/lib/password";
import { AUDIT, HOME_FOR_ROLE, ROLE } from "@/lib/constants";

/** Visar vad inbjudan gäller, utan att avslöja något om andra konton. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findUsableInvite(token);
  if (!invite) {
    return NextResponse.json(
      { error: "Länken är använd, återkallad eller för gammal" },
      { status: 404 },
    );
  }
  return NextResponse.json({
    invite: {
      email: invite.email,
      role: invite.role,
      name: invite.name,
      clubName: invite.club?.name ?? null,
      expiresAt: invite.expiresAt.toISOString(),
    },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const invite = await findUsableInvite(token);
    if (!invite) throw new ApiError(404, "Länken är använd, återkallad eller för gammal");

    const body = await readJson<{ name?: string; password?: string; birthYear?: number }>(request);
    const name = (body.name ?? invite.name ?? "").trim();
    if (!name) throw new ApiError(400, "Namn krävs");

    const passwordCheck = checkPassword(body.password ?? "", invite.email);
    if (!passwordCheck.ok) throw new ApiError(400, passwordCheck.error);

    const existing = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existing) throw new ApiError(409, "Det finns redan ett konto med den e-postadressen");

    const passwordHash = await hashPassword(body.password!);
    const birthYear = body.birthYear ?? invite.birthYear ?? new Date().getFullYear() - 16;

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: invite.email,
          name,
          passwordHash,
          role: invite.role,
          clubId: invite.role === ROLE.FOUNDER ? null : invite.clubId,
          ...(invite.role === ROLE.PLAYER
            ? {
                profile: {
                  create: {
                    level: invite.level ?? "Klubbnivå",
                    birthYear,
                    guardianConsent: false,
                    trainingAttendance: 0,
                  },
                },
              }
            : {}),
        },
      });

      await tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
      await tx.auditLog.create({
        data: {
          actorId: created.id,
          actorEmail: created.email,
          action: AUDIT.INVITE_ACCEPTED,
          targetType: "User",
          targetId: created.id,
          meta: { role: created.role, inviteId: invite.id },
        },
      });
      return created;
    });

    const sessionToken = await createSession(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const response = NextResponse.json({
      ok: true,
      redirectTo: HOME_FOR_ROLE[user.role] ?? "/",
    });
    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
