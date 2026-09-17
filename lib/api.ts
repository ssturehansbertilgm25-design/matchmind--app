import { NextResponse } from "next/server";
import { ApiError } from "./auth";

/** Gemensam felhantering: ApiError blir sin statuskod, allt annat blir 500. */
export function apiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[api] oväntat fel:", error);
  return NextResponse.json({ error: "Något gick fel" }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "Ogiltig JSON i anropet");
  }
}
