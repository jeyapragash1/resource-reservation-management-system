import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";
import { checkOrigin, errorResponse } from "@/lib/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await deleteSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
