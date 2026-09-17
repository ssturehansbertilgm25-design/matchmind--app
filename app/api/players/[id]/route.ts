import { NextResponse } from "next/server";
import { ApiError, requireRole, requirePlayerInScope } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getPlayerDetail } from "@/lib/players";
import { ROLE } from "@/lib/constants";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireRole(ROLE.COACH, ROLE.FOUNDER);
    const { id } = await params;
    await requirePlayerInScope(viewer, id);

    const detail = await getPlayerDetail(viewer.id, id);
    if (!detail) throw new ApiError(404, "Spelaren finns inte i din klubb");

    return NextResponse.json({ player: detail });
  } catch (error) {
    return apiError(error);
  }
}
