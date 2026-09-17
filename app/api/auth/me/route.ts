import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { isMockMode } from "@/lib/ai";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ user, aiDemoMode: isMockMode() });
  } catch (error) {
    return apiError(error);
  }
}
