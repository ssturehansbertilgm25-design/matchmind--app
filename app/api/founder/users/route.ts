import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFounder } from "@/lib/auth";
import { apiError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await requireFounder();
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";
    const role = url.searchParams.get("role") ?? "";
    const clubId = url.searchParams.get("clubId") ?? "";

    const users = await prisma.user.findMany({
      where: {
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" as const } },
                { email: { contains: query, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(role ? { role } : {}),
        ...(clubId ? { clubId } : {}),
      },
      include: {
        club: { select: { name: true } },
        _count: { select: { reflections: true, sessions: true } },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      take: 200,
    });

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clubId: user.clubId,
        clubName: user.club?.name ?? null,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        reflectionCount: user._count.reflections,
        sessionCount: user._count.sessions,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
