// Zod validation helper for Next.js route handlers.
//
//   const parsed = await parseJson(req, mySchema);
//   if (parsed instanceof NextResponse) return parsed; // 400 w/ details
//   // parsed is now fully typed
//
// We return a NextResponse on failure so callers can just `return` it.

import { NextRequest, NextResponse } from "next/server";
import { z, type ZodTypeAny } from "zod";

export { z };

export async function parseJson<T extends ZodTypeAny>(
  req: NextRequest | Request,
  schema: T,
): Promise<z.infer<T> | NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const res = schema.safeParse(body);
  if (!res.success) {
    return NextResponse.json(
      {
        error: "validation_failed",
        issues: res.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 400 },
    );
  }
  return res.data;
}

export function parseQuery<T extends ZodTypeAny>(req: NextRequest, schema: T): z.infer<T> | NextResponse {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const res = schema.safeParse(params);
  if (!res.success) {
    return NextResponse.json(
      {
        error: "validation_failed",
        issues: res.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 400 },
    );
  }
  return res.data;
}

// Shared primitives
export const nonEmptyString = z.string().trim().min(1);
export const emailSchema = z.string().trim().email();
export const phoneSchema = z.string().trim().regex(/^\+?[0-9()\-\s]{7,}$/);
export const isoDateString = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));
