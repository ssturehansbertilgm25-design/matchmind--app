import { NextResponse } from "next/server";
import { SESSION_COOKIE, destroyAllSessions, requireUser } from "@/lib/auth";
import { apiError } from "@/lib/api";

/** Loggar ut alla enheter, inklusive den här. */
export async function DELETE() {
  try {
    const user = await requireUser();
    const count = await destroyAllSessions(user.id);

    const response = NextResponse.json({ ok: true, closed: count });
    response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
