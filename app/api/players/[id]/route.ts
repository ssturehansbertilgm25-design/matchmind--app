import { NextResponse } from "next/server";
import { ApiError, requireCoach, requirePlayerInClub } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getPlayerDetail } from "@/lib/players";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    await requirePlayerInClub(coach, id);

    const detail = await getPlayerDetail(coach.clubId, coach.id, id);
    if (!detail) throw new ApiError(404, "Spelaren finns inte i din klubb");

    return NextResponse.json({ player: detail });
  } catch (error) {
    return apiError(error);
  }
}
