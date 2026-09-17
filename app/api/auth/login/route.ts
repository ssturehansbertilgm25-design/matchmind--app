import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, SESSION_COOKIE, createSession, verifyPassword } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const { email, password } = await readJson<{ email?: string; password?: string }>(request);
    if (!email || !password) throw new ApiError(400, "E-post och lösenord krävs");

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    // Samma svar oavsett om e-posten finns eller lösenordet är fel.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new ApiError(401, "Fel e-post eller lösenord");
    }

    const token = await createSession(user.id);
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      redirectTo: user.role === "COACH" ? "/coach" : "/player",
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
