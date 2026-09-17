import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClubmate, requirePlayer } from "@/lib/auth";
import { apiError } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const player = await requirePlayer();
    const { userId } = await params;
    const other = await requireClubmate(player, userId);

    // Regel 1: bara konversationer spelaren själv är part i.
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { fromUserId: player.id, toUserId: other.id },
          { fromUserId: other.id, toUserId: player.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json({
      partner: { id: other.id, name: other.name },
      messages: messages.map((message) => ({
        id: message.id,
        fromMe: message.fromUserId === player.id,
        text: message.text,
        createdAt: message.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
