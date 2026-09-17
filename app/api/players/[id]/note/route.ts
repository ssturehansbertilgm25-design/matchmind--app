import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireCoach, requirePlayerInClub } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    await requirePlayerInClub(coach, id);

    const { text } = await readJson<{ text?: string }>(request);
    if (typeof text !== "string") throw new ApiError(400, "Anteckningen saknas");

    const note = await prisma.coachNote.upsert({
      where: { coachId_playerId: { coachId: coach.id, playerId: id } },
      update: { text },
      create: { coachId: coach.id, playerId: id, text },
    });

    return NextResponse.json({ note: { text: note.text, updatedAt: note.updatedAt.toISOString() } });
  } catch (error) {
    return apiError(error);
  }
}
