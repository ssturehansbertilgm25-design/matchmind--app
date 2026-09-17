import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireRole, requirePlayerInScope } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { buildParentReport, summarizePlayer } from "@/lib/players";
import { ROLE } from "@/lib/constants";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireRole(ROLE.COACH, ROLE.FOUNDER);
    const { id } = await params;
    await requirePlayerInScope(viewer, id);

    const player = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        reflections: { orderBy: { createdAt: "asc" } },
        flags: { where: { resolvedAt: null } },
      },
    });
    if (!player) throw new ApiError(404, "Spelaren finns inte");

    // Rapporten byggs enbart av aggregerad data — ingen reflektionstext.
    return NextResponse.json({
      report: buildParentReport(summarizePlayer(player)),
      guardianEmail: player.profile?.guardianEmail ?? null,
      guardianConsent: player.profile?.guardianConsent ?? false,
    });
  } catch (error) {
    return apiError(error);
  }
}
