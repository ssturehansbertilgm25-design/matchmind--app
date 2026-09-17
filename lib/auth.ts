/**
 * ÅTKOMSTREGLER — MatchMind
 * =========================
 * Användarna är minderåriga (12–19 år) och datan är känslig. Reglerna nedan är
 * produktens viktigaste krav och får inte kompromissas bort. All kontroll av
 * session och roll sker server-side, i API-routes och server components.
 * INGEN åtkomstlogik får ligga i klientkoden.
 *
 *  1. En spelare ser endast sin egen data.
 *  2. En tränare ser endast spelare i sin egen klubb.
 *  3. Tränaren ser SAMMANSTÄLLD information, inte spelarens råa reflektionstext.
 *     Tränarvyn visar mående-trend, taggar, närvaro, flaggor och en kort
 *     AI-genererad sammanfattning. Råtexten visas endast om spelaren själv
 *     kryssat i "dela den här reflektionen med min tränare"
 *     (Reflection.sharedWithCoach = true).
 *  4. Vid eskalering får tränaren en flagga med en anledning på formen
 *     "hör av dig till spelaren" — ALDRIG innehållet i reflektionen.
 *  5. Föräldrarapporten innehåller aldrig råtext, bara sammanställning.
 */

import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { ROLE, type Role } from "./constants";

export const SESSION_COOKIE = "mm_session";
const SESSION_TTL_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  clubId: string;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Sessions-token lagras hashad i databasen; klienten får klartext-token i en
 * httpOnly-cookie. Läcker databasen går tokens inte att återanvända.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { token: hashToken(token), userId, expiresAt },
  });
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token: hashToken(token) } });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;

  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    clubId: user.clubId,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Inte inloggad");
  return user;
}

export async function requireCoach(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== ROLE.COACH) throw new ApiError(403, "Endast för tränare");
  return user;
}

export async function requirePlayer(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== ROLE.PLAYER) throw new ApiError(403, "Endast för spelare");
  return user;
}

/**
 * Regel 2: en tränare når endast spelare i sin egen klubb. Används av varje
 * route som tar ett spelar-id från klienten.
 */
export async function requirePlayerInClub(coach: SessionUser, playerId: string) {
  const player = await prisma.user.findFirst({
    where: { id: playerId, role: ROLE.PLAYER, clubId: coach.clubId },
    include: { profile: true },
  });
  if (!player) throw new ApiError(404, "Spelaren finns inte i din klubb");
  return player;
}

/** Regel 1: spelare når bara sina egna klubbkompisar (samma klubb) i sparringflödet. */
export async function requireClubmate(player: SessionUser, otherUserId: string) {
  const other = await prisma.user.findFirst({
    where: { id: otherUserId, clubId: player.clubId },
  });
  if (!other) throw new ApiError(404, "Användaren finns inte i din klubb");
  return other;
}
