/**
 * Granskningslogg.
 *
 * Varje administrativ åtgärd av en founder, och varje break-glass-läsning av en spelares
 * reflektionstext, skrivs hit. Appen har ingen kodväg som raderar eller ändrar poster —
 * det är hela poängen: loggen ska gå att visa upp för en spelare, en förälder eller en
 * granskare i efterhand.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { clientIp, type SessionUser } from "./auth";
import { AUDIT, type AuditAction } from "./constants";

export type AuditInput = {
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  reason?: string;
  meta?: Prisma.InputJsonValue;
};

export async function writeAudit(actor: SessionUser, input: AuditInput): Promise<void> {
  const ip = await clientIp().catch(() => "okänd");
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorEmail: actor.email,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      reason: input.reason ?? null,
      meta: { ...(input.meta as object | undefined), ip },
    },
  });
}

export const MIN_BREAK_GLASS_REASON = 15;

/**
 * Break-glass: founder öppnar en spelares reflektionstext.
 *
 * Kräver ett skrivet skäl och loggas alltid. Anropas bara från
 * /api/founder/players/[id]/reveal — det finns ingen annan väg till texten för en founder.
 */
export async function revealReflectionText(
  founder: SessionUser,
  playerId: string,
  reason: string,
): Promise<{ id: string; createdAt: Date; mood: number; tag: string | null; text: string | null }[]> {
  const reflections = await prisma.reflection.findMany({
    where: { playerId, text: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, createdAt: true, mood: true, tag: true, text: true },
  });

  await writeAudit(founder, {
    action: AUDIT.REFLECTION_TEXT_REVEALED,
    targetType: "User",
    targetId: playerId,
    reason,
    meta: { reflectionCount: reflections.length },
  });

  return reflections;
}
