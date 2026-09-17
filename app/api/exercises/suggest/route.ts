import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requirePlayer } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";
import { checkLoad } from "@/lib/load";
import { exercisesFor } from "@/lib/exercises";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/constants";
import { generateExerciseMessage, isMockMode } from "@/lib/ai";

/** Måndag = 0 ... söndag = 6, samma som ScheduleEntry.weekday. */
function todayWeekday(): number {
  return (new Date().getDay() + 6) % 7;
}

export async function POST(request: Request) {
  try {
    const player = await requirePlayer();
    const body = await readJson<{ muscleGroup?: string; weekday?: number | null }>(request);

    const muscleGroup = body.muscleGroup as MuscleGroup;
    if (!MUSCLE_GROUPS.includes(muscleGroup)) {
      throw new ApiError(400, `Okänd muskelgrupp. Välj en av: ${MUSCLE_GROUPS.join(", ")}`);
    }

    const weekday = body.weekday ?? null;
    if (weekday !== null && (!Number.isInteger(weekday) || weekday < 0 || weekday > 6)) {
      throw new ApiError(400, "Dag måste vara 0–6 (måndag–söndag)");
    }

    const [schedule, teamPlan] = await Promise.all([
      prisma.scheduleEntry.findMany({
        where: { playerId: player.id },
        orderBy: { weekday: "asc" },
      }),
      prisma.teamPlan.findUnique({ where: { clubId: player.clubId } }),
    ]);

    // Beslutet fattas här, i kod — AI:n formulerar bara texten runt det.
    const decision = checkLoad(schedule, muscleGroup, weekday ?? todayWeekday());
    const exercises = exercisesFor(muscleGroup, decision.level);

    const message = await generateExerciseMessage({
      approved: decision.approved,
      muscleGroup: decision.muscleGroup,
      requestedDayLabel: decision.requestedDayLabel,
      hardDayLabel: decision.hardDayLabel,
      hardFocus: decision.hardFocus,
      suggestedDayLabel: decision.suggestedDayLabel,
      alreadyHighThatDay: decision.alreadyHighThatDay,
      reason: decision.reason,
      teamPlan: teamPlan?.text ?? null,
      exercises,
    });

    return NextResponse.json({
      decision,
      exercises,
      message,
      usedTeamPlan: Boolean(teamPlan),
      aiDemoMode: isMockMode(),
    });
  } catch (error) {
    return apiError(error);
  }
}
