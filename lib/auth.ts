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
 *
 *  6. FOUNDER står utanför klubbstrukturen och administrerar hela appen: klubbar,
 *     konton, roller, inbjudningar, flaggor och träningsplaner. Founder ser INTE
 *     reflektionstext i vanliga vyer. Texten kan öppnas via break-glass, vilket
 *     kräver ett angivet skäl och skriver en post i AuditLog som appen aldrig
 *     raderar (se lib/audit.ts).
 */

import { cookies, headers } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { ROLE, type Role } from "./constants";

export const SESSION_COOKIE = "mm_session";
const SESSION_TTL_DAYS = 30;
const BCRYPT_ROUNDS = 12;

/** Rate limiting: så många misslyckade försök tillåts inom fönstret. */
const MAX_ATTEMPTS_PER_EMAIL = 8;
const MAX_ATTEMPTS_PER_IP = 30;
const ATTEMPT_WINDOW_MINUTES = 15;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  clubId: string | null;
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
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Tokens lagras hashade. Läcker databasen går de inte att återanvända. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken(): string {
  return randomBytes(32).toString("hex");
}

export async function clientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "okänd";
}

export async function createSession(userId: string): Promise<string> {
  const token = newToken();
  const headerList = await headers();
  await prisma.session.create({
    data: {
      token: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
      userAgent: headerList.get("user-agent")?.slice(0, 200) ?? null,
    },
  });
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token: hashToken(token) } });
}

/** Används vid lösenordsbyte och när en founder stänger av ett konto. */
export async function destroyAllSessions(userId: string): Promise<number> {
  const result = await prisma.session.deleteMany({ where: { userId } });
  return result.count;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  // Avaktiverade konton tappar åtkomst direkt, utan att sessionen behöver gå ut.
  if (!session.user.isActive) return null;

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

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new ApiError(403, "Du saknar behörighet");
  return user;
}

export function requireFounder(): Promise<SessionUser> {
  return requireRole(ROLE.FOUNDER);
}

export function requireCoach(): Promise<SessionUser> {
  return requireRole(ROLE.COACH);
}

export function requirePlayer(): Promise<SessionUser> {
  return requireRole(ROLE.PLAYER);
}

/** Tränare måste tillhöra en klubb för att kunna arbeta med spelare. */
export async function requireCoachWithClub(): Promise<SessionUser & { clubId: string }> {
  const coach = await requireCoach();
  if (!coach.clubId) {
    throw new ApiError(403, "Ditt tränarkonto saknar klubb — be en founder koppla dig till en klubb");
  }
  return coach as SessionUser & { clubId: string };
}

/**
 * Regel 2: en tränare når endast spelare i sin egen klubb. Founder når alla spelare,
 * men får fortfarande ingen reflektionstext utan break-glass (se lib/audit.ts).
 */
export async function requirePlayerInScope(actor: SessionUser, playerId: string) {
  const player = await prisma.user.findFirst({
    where: {
      id: playerId,
      role: ROLE.PLAYER,
      ...(actor.role === ROLE.FOUNDER ? {} : { clubId: actor.clubId ?? "__ingen__" }),
    },
    include: { profile: true },
  });
  if (!player) throw new ApiError(404, "Spelaren finns inte i din klubb");
  return player;
}

/** Regel 1: spelare når bara klubbkompisar i sparringflödet. */
export async function requireClubmate(player: SessionUser, otherUserId: string) {
  const other = await prisma.user.findFirst({
    where: { id: otherUserId, clubId: player.clubId ?? "__ingen__", isActive: true },
  });
  if (!other) throw new ApiError(404, "Användaren finns inte i din klubb");
  return other;
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterMinutes: number };

/** Bromsar lösenordsgissning per e-post och per IP. */
export async function checkLoginRateLimit(email: string, ip: string): Promise<RateLimitResult> {
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60 * 1000);
  const [byEmail, byIp] = await Promise.all([
    prisma.loginAttempt.count({ where: { email, createdAt: { gte: since } } }),
    prisma.loginAttempt.count({ where: { ip, createdAt: { gte: since } } }),
  ]);
  if (byEmail >= MAX_ATTEMPTS_PER_EMAIL || byIp >= MAX_ATTEMPTS_PER_IP) {
    return { allowed: false, retryAfterMinutes: ATTEMPT_WINDOW_MINUTES };
  }
  return { allowed: true };
}

export async function recordFailedLogin(email: string, ip: string): Promise<void> {
  await prisma.loginAttempt.create({ data: { email, ip } });
}

export async function clearLoginAttempts(email: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { email } });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
