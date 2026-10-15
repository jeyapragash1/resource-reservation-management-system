import { NextResponse } from "next/server";
import { deleteSession } from "@/backend/lib/auth";
import { checkOrigin, errorResponse } from "@/backend/lib/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await deleteSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
