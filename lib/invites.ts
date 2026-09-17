/**
 * Inbjudningar.
 *
 * Appen har ingen öppen registrering — konton skapas bara via en inbjudningslänk.
 * En founder kan bjuda in vilken roll som helst; en tränare kan bara bjuda in spelare
 * till sin egen klubb. Token visas en enda gång, när länken skapas, och lagras hashad.
 */

import { prisma } from "./db";
import { ApiError, hashToken, newToken, normalizeEmail, type SessionUser } from "./auth";
import { ROLE, type Role } from "./constants";

const INVITE_TTL_DAYS = 14;

export type CreateInviteInput = {
  email: string;
  role: Role;
  clubId?: string | null;
  name?: string | null;
  level?: string | null;
  birthYear?: number | null;
};

export type CreatedInvite = {
  id: string;
  email: string;
  role: Role;
  url: string;
  expiresAt: Date;
};

export function inviteUrl(token: string): string {
  const base = process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
  return `${base}/invite/${token}`;
}

export async function createInvite(
  actor: SessionUser,
  input: CreateInviteInput,
): Promise<CreatedInvite> {
  const email = normalizeEmail(input.email);
  if (!email.includes("@")) throw new ApiError(400, "Ogiltig e-postadress");

  // En tränare får bara bjuda in spelare, och bara till sin egen klubb.
  let clubId = input.clubId ?? null;
  if (actor.role === ROLE.COACH) {
    if (input.role !== ROLE.PLAYER) throw new ApiError(403, "Tränare kan bara bjuda in spelare");
    if (!actor.clubId) throw new ApiError(403, "Ditt tränarkonto saknar klubb");
    clubId = actor.clubId;
  } else if (actor.role !== ROLE.FOUNDER) {
    throw new ApiError(403, "Du saknar behörighet att bjuda in");
  }

  if (input.role === ROLE.FOUNDER) {
    clubId = null;
  } else if (!clubId) {
    throw new ApiError(400, "Tränare och spelare måste kopplas till en klubb");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, "Det finns redan ett konto med den e-postadressen");

  // En ny inbjudan ersätter tidigare öppna till samma adress.
  await prisma.invite.updateMany({
    where: { email, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const token = newToken();
  const invite = await prisma.invite.create({
    data: {
      email,
      role: input.role,
      clubId,
      tokenHash: hashToken(token),
      createdById: actor.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
      name: input.name?.trim() || null,
      level: input.level?.trim() || null,
      birthYear: input.birthYear ?? null,
    },
  });

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role as Role,
    url: inviteUrl(token),
    expiresAt: invite.expiresAt,
  };
}

export type InviteStatus = "open" | "accepted" | "revoked" | "expired";

export function inviteStatus(invite: {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}): InviteStatus {
  if (invite.acceptedAt) return "accepted";
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt.getTime() < Date.now()) return "expired";
  return "open";
}

/** Slår upp en inbjudan från länkens token. Returnerar null om den inte går att använda. */
export async function findUsableInvite(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { club: true },
  });
  if (!invite || inviteStatus(invite) !== "open") return null;
  return invite;
}
