import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFounder } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { isMockMode } from "@/lib/ai";
import { ROLE } from "@/lib/constants";

export async function GET() {
  try {
    await requireFounder();

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [clubs, founders, coaches, players, reflections, weekReflections, openFlags, escalations, openInvites] =
      await Promise.all([
        prisma.club.count(),
        prisma.user.count({ where: { role: ROLE.FOUNDER, isActive: true } }),
        prisma.user.count({ where: { role: ROLE.COACH, isActive: true } }),
        prisma.user.count({ where: { role: ROLE.PLAYER, isActive: true } }),
        prisma.reflection.count(),
        prisma.reflection.count({ where: { createdAt: { gte: since } } }),
        prisma.flag.count({ where: { resolvedAt: null } }),
        prisma.flag.count({ where: { resolvedAt: null, type: "ESCALATION" } }),
        prisma.invite.count({ where: { acceptedAt: null, revokedAt: null } }),
      ]);

    const recentAudit = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    return NextResponse.json({
      stats: {
        clubs,
        founders,
        coaches,
        players,
        reflections,
        weekReflections,
        openFlags,
        escalations,
        openInvites,
      },
      aiDemoMode: isMockMode(),
      recentAudit: recentAudit.map((entry) => ({
        id: entry.id,
        action: entry.action,
        actorEmail: entry.actorEmail,
        targetType: entry.targetType,
        targetId: entry.targetId,
        reason: entry.reason,
        createdAt: entry.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
