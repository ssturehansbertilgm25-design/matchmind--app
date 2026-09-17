import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, destroyAllSessions, requireFounder } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { AUDIT } from "@/lib/constants";

/** Tvingar ut ett konto ur alla enheter, t.ex. vid en borttappad telefon. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const founder = await requireFounder();
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, "Kontot finns inte");

    const closed = await destroyAllSessions(id);
    await writeAudit(founder, {
      action: AUDIT.USER_SESSIONS_REVOKED,
      targetType: "User",
      targetId: id,
      meta: { email: user.email, closed },
    });

    return NextResponse.json({ ok: true, closed });
  } catch (error) {
    return apiError(error);
  }
}
