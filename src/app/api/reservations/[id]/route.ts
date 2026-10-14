import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { idSchema, reservationSchema } from "@/lib/validation";
import { saveReservation, cancelReservation } from "@/lib/reservations";
import { body, checkOrigin, errorResponse } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const id = idSchema.parse((await context.params).id);
    return NextResponse.json(
      await saveReservation(
        user,
        reservationSchema.parse(await body(request)),
        id,
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    await cancelReservation(user, idSchema.parse((await context.params).id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
