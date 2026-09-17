import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  ApiError,
  SESSION_COOKIE,
  createSession,
  destroyAllSessions,
  hashPassword,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";
import { checkPassword } from "@/lib/password";
import { writeAudit } from "@/lib/audit";
import { AUDIT } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { currentPassword, newPassword } = await readJson<{
      currentPassword?: string;
      newPassword?: string;
    }>(request);

    const record = await prisma.user.findUnique({ where: { id: user.id } });
    if (!record) throw new ApiError(404, "Kontot finns inte");
    if (!currentPassword || !(await verifyPassword(currentPassword, record.passwordHash))) {
      throw new ApiError(401, "Fel nuvarande lösenord");
    }

    const check = checkPassword(newPassword ?? "", user.email);
    if (!check.ok) throw new ApiError(400, check.error);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword!) },
    });

    // Alla gamla sessioner sägs upp; den här enheten får en ny.
    await destroyAllSessions(user.id);
    const token = await createSession(user.id);
    await writeAudit(user, { action: AUDIT.PASSWORD_CHANGED, targetType: "User", targetId: user.id });

    const response = NextResponse.json({ ok: true });
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
