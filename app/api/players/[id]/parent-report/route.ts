import { NextResponse } from "next/server";
import { ApiError, requireCoach, requirePlayerInClub } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { buildParentReport, getClubPlayers } from "@/lib/players";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const player = await requirePlayerInClub(coach, id);

    const summaries = await getClubPlayers(coach.clubId);
    const summary = summaries.find((item) => item.id === id);
    if (!summary) throw new ApiError(404, "Spelaren finns inte i din klubb");

    // Rapporten byggs enbart av aggregerad data — ingen reflektionstext.
    return NextResponse.json({
      report: buildParentReport(summary),
      guardianEmail: player.profile?.guardianEmail ?? null,
      guardianConsent: player.profile?.guardianConsent ?? false,
    });
  } catch (error) {
    return apiError(error);
  }
}
