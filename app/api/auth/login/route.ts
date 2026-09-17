import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  ApiError,
  SESSION_COOKIE,
  checkLoginRateLimit,
  clearLoginAttempts,
  clientIp,
  createSession,
  normalizeEmail,
  recordFailedLogin,
  verifyPassword,
} from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";
import { HOME_FOR_ROLE } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ email?: string; password?: string }>(request);
    if (!body.email || !body.password) throw new ApiError(400, "E-post och lösenord krävs");

    const email = normalizeEmail(body.email);
    const ip = await clientIp();

    const limit = await checkLoginRateLimit(email, ip);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        `För många misslyckade försök. Försök igen om ${limit.retryAfterMinutes} minuter.`,
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Samma svar oavsett om e-posten finns eller lösenordet är fel.
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      await recordFailedLogin(email, ip);
      throw new ApiError(401, "Fel e-post eller lösenord");
    }
    if (!user.isActive) {
      throw new ApiError(403, "Kontot är avstängt. Kontakta din klubb eller MatchMind-supporten.");
    }

    await clearLoginAttempts(email);
    const token = await createSession(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      redirectTo: HOME_FOR_ROLE[user.role] ?? "/",
    });
    response.cookies.set(SESSION_COOKIE, token, {
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
