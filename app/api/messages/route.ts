import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireClubmate, requirePlayer } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const player = await requirePlayer();
    const { toUserId, text } = await readJson<{ toUserId?: string; text?: string }>(request);

    if (!toUserId) throw new ApiError(400, "Mottagare saknas");
    const trimmed = text?.trim();
    if (!trimmed) throw new ApiError(400, "Meddelandet är tomt");
    if (trimmed.length > 1000) throw new ApiError(400, "Meddelandet är för långt");
    if (toUserId === player.id) throw new ApiError(400, "Du kan inte skicka till dig själv");

    await requireClubmate(player, toUserId);

    const message = await prisma.message.create({
      data: { fromUserId: player.id, toUserId, text: trimmed },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        fromMe: true,
        text: message.text,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
