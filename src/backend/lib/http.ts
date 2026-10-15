import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0].message },
      { status: 400 },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const code = (error as { code?: string })?.code;
  if (code === "23P01")
    return NextResponse.json(
      {
        error:
          "This resource is already reserved during that time. Choose another time or resource.",
      },
      { status: 409 },
    );
  if (code === "23505")
    return NextResponse.json(
      { error: "An active resource with this name already exists." },
      { status: 409 },
    );
  console.error("Request failed", error);
  return NextResponse.json(
    { error: "The request could not be completed. Please try again." },
    { status: 500 },
  );
}
export function checkOrigin(request: Request) {
  const expected = process.env.APP_URL;
  if (!expected) throw new HttpError(500, "Application URL is not configured.");
  const configured = new URL(expected);
  const origin = request.headers.get("origin");
  if (origin === configured.origin) return;
  if (origin) {
    try {
      const incoming = new URL(origin);
      const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
      if (
        origin === incoming.origin &&
        loopback.has(configured.hostname) &&
        loopback.has(incoming.hostname) &&
        incoming.protocol === configured.protocol &&
        incoming.port === configured.port
      )
        return;
    } catch {
      // Invalid origins are rejected below.
    }
  }
  throw new HttpError(403, "Request origin is not allowed.");
}
export async function body(request: Request) {
  const value = await request.text();
  if (value.length > 16384)
    throw new HttpError(413, "Request body is too large.");
  return JSON.parse(value);
}
