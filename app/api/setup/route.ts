import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  ApiError,
  SESSION_COOKIE,
  createSession,
  hashPassword,
  normalizeEmail,
} from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";
import { checkPassword } from "@/lib/password";
import { AUDIT, ROLE } from "@/lib/constants";

/**
 * Engångssetup: skapar det första founder-kontot.
 *
 * Stängs permanent så fort det finns en founder i databasen. Sätt SETUP_TOKEN i miljön
 * om appen ligger publikt innan du hunnit köra setupen — då krävs den koden också.
 */

async function founderExists(): Promise<boolean> {
  const count = await prisma.user.count({ where: { role: ROLE.FOUNDER } });
  return count > 0;
}

export async function GET() {
  return NextResponse.json({
    needsSetup: !(await founderExists()),
    requiresToken: Boolean(process.env.SETUP_TOKEN),
  });
}

export async function POST(request: Request) {
  try {
    if (await founderExists()) {
      throw new ApiError(403, "Setupen är redan genomförd");
    }

    const body = await readJson<{
      email?: string;
      name?: string;
      password?: string;
      setupToken?: string;
    }>(request);

    const expectedToken = process.env.SETUP_TOKEN;
    if (expectedToken && body.setupToken !== expectedToken) {
      throw new ApiError(403, "Fel setup-kod");
    }

    const email = normalizeEmail(body.email ?? "");
    const name = body.name?.trim();
    const password = body.password ?? "";

    if (!email.includes("@")) throw new ApiError(400, "Ogiltig e-postadress");
    if (!name) throw new ApiError(400, "Namn krävs");

    const passwordCheck = checkPassword(password, email);
    if (!passwordCheck.ok) throw new ApiError(400, passwordCheck.error);

    const founder = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: await hashPassword(password),
        role: ROLE.FOUNDER,
        clubId: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: founder.id,
        actorEmail: founder.email,
        action: AUDIT.FOUNDER_CREATED,
        targetType: "User",
        targetId: founder.id,
        meta: { via: "setup" },
      },
    });

    const token = await createSession(founder.id);
    await prisma.user.update({ where: { id: founder.id }, data: { lastLoginAt: new Date() } });
    const response = NextResponse.json({ ok: true, redirectTo: "/founder" });
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
