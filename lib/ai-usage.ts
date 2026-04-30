// AI usage logging — one row per Gemini call so we can:
//   1. Show admins per-doctor / per-feature usage
//   2. Bill clinics for AI consumption
//   3. Catch runaway costs early (anomaly detection)
//
// Schema is created lazily on first write. We deliberately don't index
// on ai_call_id (we never look up by it) — only on (created_at, route,
// caller_email) which is what the dashboard queries.

import { sql, ensureSchema } from "./db";
import { log } from "./log";

export interface AiUsageRecord {
  /** Logical name of the call site, e.g. "ai-emr.patient-summary". */
  route: string;
  /** Doctor / clinician email that triggered the call. May be empty for
   *  patient-side calls (post-visit Q&A) — store the patient email then. */
  callerEmail?: string;
  /** Patient email when known (post-visit Q&A, scribe). */
  patientEmail?: string;
  /** Gemini model that actually answered (we fall back through several). */
  model?: string;
  promptTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  /** Total wall time of the upstream call in milliseconds. */
  latencyMs?: number;
  /** Whether the call succeeded (for failure-rate dashboards). */
  ok: boolean;
  /** Short error label when !ok, e.g. "rate_limited", "invalid_json". */
  errorTag?: string;
}

async function initSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS ai_usage (
      id BIGSERIAL PRIMARY KEY,
      route TEXT NOT NULL,
      caller_email TEXT,
      patient_email TEXT,
      model TEXT,
      prompt_tokens INT,
      output_tokens INT,
      total_tokens INT,
      latency_ms INT,
      ok BOOLEAN NOT NULL DEFAULT true,
      error_tag TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ai_usage_caller ON ai_usage (caller_email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ai_usage_route ON ai_usage (route)`;
}

let ready: Promise<void> | null = null;
function whenReady(): Promise<void> {
  if (!ready) ready = ensureSchema(initSchema);
  return ready;
}

/** Best-effort write. We never let logging failures break the actual
 *  user-facing AI feature — log the error and move on. */
export async function recordAiUsage(rec: AiUsageRecord): Promise<void> {
  try {
    await whenReady();
    await sql`
      INSERT INTO ai_usage
        (route, caller_email, patient_email, model,
         prompt_tokens, output_tokens, total_tokens, latency_ms, ok, error_tag)
      VALUES
        (${rec.route},
         ${rec.callerEmail || null},
         ${rec.patientEmail || null},
         ${rec.model || null},
         ${rec.promptTokens ?? null},
         ${rec.outputTokens ?? null},
         ${rec.totalTokens ?? null},
         ${rec.latencyMs ?? null},
         ${rec.ok},
         ${rec.errorTag || null})
    `;
  } catch (err) {
    log.error("ai_usage.record_failed", err, { route: rec.route });
  }
}

export interface UsageSummaryRow {
  route: string;
  calls: number;
  tokens: number;
  errors: number;
  avgLatencyMs: number;
}

export interface DoctorUsageRow {
  callerEmail: string;
  calls: number;
  tokens: number;
  scribeMinutes: number;
}

/** Aggregate calls + tokens per route over the last `days` days. */
export async function summariseByRoute(days = 30): Promise<UsageSummaryRow[]> {
  await whenReady();
  const rows = (await sql`
    SELECT route,
           COUNT(*)::int AS calls,
           COALESCE(SUM(total_tokens), 0)::int AS tokens,
           COUNT(*) FILTER (WHERE NOT ok)::int AS errors,
           COALESCE(AVG(latency_ms)::int, 0)::int AS avg_latency
    FROM ai_usage
    WHERE created_at > now() - (${days} || ' days')::interval
    GROUP BY route
    ORDER BY calls DESC
  `) as Array<{
    route: string;
    calls: number;
    tokens: number;
    errors: number;
    avg_latency: number;
  }>;
  return rows.map((r) => ({
    route: r.route,
    calls: r.calls,
    tokens: r.tokens,
    errors: r.errors,
    avgLatencyMs: r.avg_latency,
  }));
}

/** Aggregate by caller email so admins can see which doctor used what. */
export async function summariseByCaller(days = 30, limit = 100): Promise<DoctorUsageRow[]> {
  await whenReady();
  const rows = (await sql`
    SELECT
      COALESCE(caller_email, '(anonymous)') AS caller_email,
      COUNT(*)::int AS calls,
      COALESCE(SUM(total_tokens), 0)::int AS tokens,
      -- one scribe call ≈ 5 minutes of recording on average; rough but
      -- gives clinics a usable "AI minutes consumed" number.
      (COUNT(*) FILTER (WHERE route = 'ai-scribe') * 5)::int AS scribe_minutes
    FROM ai_usage
    WHERE created_at > now() - (${days} || ' days')::interval
    GROUP BY caller_email
    ORDER BY calls DESC
    LIMIT ${limit}
  `) as Array<{
    caller_email: string;
    calls: number;
    tokens: number;
    scribe_minutes: number;
  }>;
  return rows.map((r) => ({
    callerEmail: r.caller_email,
    calls: r.calls,
    tokens: r.tokens,
    scribeMinutes: r.scribe_minutes,
  }));
}

/** Total token spend over the last N days. Used for the dashboard
 *  hero number. */
export async function totalTokens(days = 30): Promise<{ tokens: number; calls: number; errors: number }> {
  await whenReady();
  const rows = (await sql`
    SELECT
      COUNT(*)::int AS calls,
      COALESCE(SUM(total_tokens), 0)::int AS tokens,
      COUNT(*) FILTER (WHERE NOT ok)::int AS errors
    FROM ai_usage
    WHERE created_at > now() - (${days} || ' days')::interval
  `) as Array<{ calls: number; tokens: number; errors: number }>;
  return rows[0] || { tokens: 0, calls: 0, errors: 0 };
}
