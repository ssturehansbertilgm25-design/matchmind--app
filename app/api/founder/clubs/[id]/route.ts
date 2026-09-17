import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireFounder } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { AUDIT } from "@/lib/constants";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const founder = await requireFounder();
    const { id } = await params;
    const body = await readJson<{ name?: string; teamPlan?: string }>(request);

    const club = await prisma.club.findUnique({ where: { id } });
    if (!club) throw new ApiError(404, "Klubben finns inte");

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) throw new ApiError(400, "Klubbnamn krävs");
      await prisma.club.update({ where: { id }, data: { name } });
      await writeAudit(founder, {
        action: AUDIT.CLUB_RENAMED,
        targetType: "Club",
        targetId: id,
        meta: { from: club.name, to: name },
      });
    }

    if (typeof body.teamPlan === "string") {
      await prisma.teamPlan.upsert({
        where: { clubId: id },
        update: { text: body.teamPlan },
        create: { clubId: id, text: body.teamPlan },
      });
      await writeAudit(founder, {
        action: AUDIT.TEAM_PLAN_EDITED,
        targetType: "Club",
        targetId: id,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const founder = await requireFounder();
    const { id } = await params;

    const club = await prisma.club.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!club) throw new ApiError(404, "Klubben finns inte");

    // Radering tar med sig konton, reflektioner och scheman — kräver uttryckligt medgivande.
    const url = new URL(request.url);
    if (url.searchParams.get("confirm") !== club.name) {
      throw new ApiError(400, "Skriv klubbens namn för att bekräfta raderingen");
    }

    // Klubbens konton raderas uttryckligen — annars blir de kvar utan klubb. Reflektioner,
    // scheman och meddelanden följer med via cascade på User.
    await prisma.$transaction([
      prisma.user.deleteMany({ where: { clubId: id } }),
      prisma.club.delete({ where: { id } }),
    ]);
    await writeAudit(founder, {
      action: AUDIT.CLUB_DELETED,
      targetType: "Club",
      targetId: id,
      meta: { name: club.name, userCount: club._count.users },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
