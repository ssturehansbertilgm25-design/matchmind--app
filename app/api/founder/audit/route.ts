import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFounder } from "@/lib/auth";
import { apiError } from "@/lib/api";

/** Loggen är läsbar men aldrig skrivbar eller raderbar härifrån — det finns ingen sådan route. */
export async function GET(request: Request) {
  try {
    await requireFounder();
    const url = new URL(request.url);
    const action = url.searchParams.get("action") ?? "";

    const entries = await prisma.auditLog.findMany({
      where: action ? { action } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      entries: entries.map((entry) => ({
        id: entry.id,
        action: entry.action,
        actorEmail: entry.actorEmail,
        targetType: entry.targetType,
        targetId: entry.targetId,
        reason: entry.reason,
        meta: entry.meta,
        createdAt: entry.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
