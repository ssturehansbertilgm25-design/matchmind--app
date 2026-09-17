import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isMockMode } from "@/lib/ai";
import { checkEnv } from "@/lib/env";

/** Hälsokontroll för uppföljning i drift. Läcker inga uppgifter om användare. */
export async function GET() {
  const problems = checkEnv();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: problems.some((problem) => problem.level === "error") ? "degraded" : "ok",
      database: "ok",
      aiMode: isMockMode() ? "demo" : "live",
      problems: problems.map((problem) => `${problem.level}: ${problem.message}`),
    });
  } catch {
    return NextResponse.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}
