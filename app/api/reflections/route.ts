import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requirePlayer } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";
import {
  ESCALATION_FLAG_REASON,
  ESCALATION_MESSAGE,
  generateReflectionFeedback,
  isMockMode,
} from "@/lib/ai";
import { FLAG_TYPE } from "@/lib/constants";

type Body = {
  mood?: number;
  tag?: string | null;
  text?: string | null;
  sharedWithCoach?: boolean;
};

export async function POST(request: Request) {
  try {
    const player = await requirePlayer();
    const body = await readJson<Body>(request);

    const mood = Number(body.mood);
    if (!Number.isInteger(mood) || mood < 1 || mood > 5) {
      throw new ApiError(400, "Mående måste vara ett heltal 1–5");
    }
    const tag = body.tag?.trim() || null;
    const text = body.text?.trim() || null;
    if (!tag && !text) throw new ApiError(400, "Välj en tagg eller skriv några ord");

    const feedback = await generateReflectionFeedback({ mood, tag, text });

    if (feedback.escalate) {
      // Reflektionen sparas, men ingen AI-feedback och ingen delning med tränaren:
      // tränaren får bara en flagga om att höra av sig, aldrig innehållet.
      const reflection = await prisma.reflection.create({
        data: {
          playerId: player.id,
          mood,
          tag,
          text,
          sharedWithCoach: false,
          escalated: true,
        },
      });
      await prisma.flag.create({
        data: {
          playerId: player.id,
          type: FLAG_TYPE.ESCALATION,
          reason: ESCALATION_FLAG_REASON,
        },
      });
      return NextResponse.json({
        id: reflection.id,
        escalated: true,
        message: ESCALATION_MESSAGE,
        aiDemoMode: isMockMode(),
      });
    }

    const reflection = await prisma.reflection.create({
      data: {
        playerId: player.id,
        mood,
        tag,
        text,
        sharedWithCoach: Boolean(body.sharedWithCoach),
        escalated: false,
        aiFeedback: {
          create: {
            diagnosis: feedback.diagnosis,
            technique: feedback.technique,
            followup: feedback.followup,
            model: feedback.model,
          },
        },
      },
      include: { aiFeedback: true },
    });

    return NextResponse.json({
      id: reflection.id,
      escalated: false,
      sharedWithCoach: reflection.sharedWithCoach,
      feedback: {
        diagnosis: feedback.diagnosis,
        technique: feedback.technique,
        followup: feedback.followup,
      },
      aiDemoMode: isMockMode(),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function GET() {
  try {
    const player = await requirePlayer();
    const reflections = await prisma.reflection.findMany({
      where: { playerId: player.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { aiFeedback: true },
    });

    return NextResponse.json({
      reflections: reflections.map((reflection) => ({
        id: reflection.id,
        createdAt: reflection.createdAt.toISOString(),
        mood: reflection.mood,
        tag: reflection.tag,
        text: reflection.text,
        sharedWithCoach: reflection.sharedWithCoach,
        escalated: reflection.escalated,
        feedback: reflection.aiFeedback
          ? {
              diagnosis: reflection.aiFeedback.diagnosis,
              technique: reflection.aiFeedback.technique,
              followup: reflection.aiFeedback.followup,
            }
          : null,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
