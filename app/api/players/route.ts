import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { buildWeeklyDigest, clubStats, getClubPlayers, sortByAttention } from "@/lib/players";

export async function GET() {
  try {
    const coach = await requireCoach();
    const players = await getClubPlayers(coach.clubId);

    return NextResponse.json({
      players: sortByAttention(players),
      stats: clubStats(players),
      digest: buildWeeklyDigest(players),
    });
  } catch (error) {
    return apiError(error);
  }
}
