// Admin: rebuild the AI feedback aggregates from raw rows.
// Useful after first-time deploy of the aggregates table or if
// the persistent layer's flush ever falls out of sync.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rebuildAggregates } from "@/lib/ai-feedback-aggregates";
import { invalidateRerankerCache } from "@/lib/ai-reranker";
import { bindPersistentArray } from "@/lib/persistent-array";
import type { AiFeedbackRow } from "@/lib/ai-feedback-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";

// Mirror the same persistent table so we can read raw feedback rows
// without the (server-side) ai-feedback-store auto-bumping aggregates
// during the rebuild loop.
const mirror: AiFeedbackRow[] = [];
const { hydrate: hydrateMirror } = bindPersistentArray<AiFeedbackRow>(
  "ai-feedback",
  mirror,
  () => [],
);

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  await hydrateMirror();
  const count = await rebuildAggregates(
    mirror.map((r) => ({ surface: r.surface, suggestion: r.suggestion, verdict: r.verdict })),
  );
  invalidateRerankerCache();
  await awaitAllFlushesStrict().catch(() => {});
  return NextResponse.json({ ok: true, aggregatesRebuilt: count, fromRawRows: mirror.length });
}
