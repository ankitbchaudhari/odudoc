// Small Zod helper for API routes.
//
// Usage:
//   const parsed = await parseJson(req, Schema);
//   if (!parsed.ok) return parsed.response;
//   const body = parsed.data;

import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseJson<S extends ZodTypeAny>(
  req: NextRequest,
  schema: S,
): Promise<ParseResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, response: zodErrorResponse(result.error) };
  }
  return { ok: true, data: result.data };
}

export function zodErrorResponse(err: ZodError): NextResponse {
  const issues = err.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));
  const firstMessage = issues[0]
    ? `${issues[0].path || "body"}: ${issues[0].message}`
    : "Invalid request body";
  return NextResponse.json(
    { error: firstMessage, issues },
    { status: 400 },
  );
}
