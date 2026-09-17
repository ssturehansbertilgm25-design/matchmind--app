import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireCoach } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";

export async function GET() {
  try {
    const coach = await requireCoach();
    const plan = await prisma.teamPlan.findUnique({ where: { clubId: coach.clubId } });
    return NextResponse.json({
      teamPlan: plan ? { text: plan.text, updatedAt: plan.updatedAt.toISOString() } : null,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const coach = await requireCoach();
    const { text } = await readJson<{ text?: string }>(request);
    if (typeof text !== "string") throw new ApiError(400, "Träningsplanen saknas");

    const plan = await prisma.teamPlan.upsert({
      where: { clubId: coach.clubId },
      update: { text },
      create: { clubId: coach.clubId, text },
    });

    return NextResponse.json({
      teamPlan: { text: plan.text, updatedAt: plan.updatedAt.toISOString() },
    });
  } catch (error) {
    return apiError(error);
  }
}
