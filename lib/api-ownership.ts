// V14 of the Master Spec — endpoint ownership manifest.
//
// Every API route in this codebase belongs to one of four
// audiences. This file is the typed source-of-truth for that
// mapping. The /admin/v14-audit page renders it. The pre-deploy
// audit script (scripts/v14-audit.ts) cross-checks the actual
// auth code on each route against the declared ownership.
//
// Audiences:
//
//   patient        — the patient mobile app (Odudoc). Calls hit
//                    routes that scope to "own data" — the auth
//                    layer + lib/qr-store + V12 RLS GUC
//                    (odudoc.patient_id) enforce that.
//
//   pro            — the OduDoc Pro app + admin web. Tenant-
//                    scoped (odudoc.tenant_id GUC). 28 role
//                    flavours: doctor, nurse, lab-tech,
//                    pharmacist, admin, support, hr, etc.
//
//   shared         — endpoints used by BOTH apps. Auth required;
//                    the scope is determined per-call by the
//                    session's role.
//
//   public         — no auth required. Marketing site + public
//                    verifiers (V7 anti-counterfeit, V11 entity
//                    profiles, V13 blockchain certificate
//                    verifier).
//
// RLS strategies:
//
//   self           — patient_id GUC pins reads to the signed-in
//                    user's own rows
//   tenant         — tenant_id GUC pins reads to the active
//                    hospital
//   tenant_admin   — tenant_id PLUS role gate (admin / hod / mgr)
//   super_admin    — only platform admins (SUPER_ADMIN_EMAILS env)
//   public         — no row-scoping; entire dataset is public
//   role           — role gate, no tenant scope (e.g. all admins
//                    see all withdrawals platform-wide today)
//   token          — possession of the right token IS the auth
//                    (V16 QR scans, V7 anti-counterfeit serials,
//                    public profile slugs)

export type Audience = "patient" | "pro" | "shared" | "public";
export type RlsStrategy = "self" | "tenant" | "tenant_admin" | "super_admin" | "role" | "public" | "token";

export interface EndpointOwnership {
  /** URL pattern, e.g. "/api/qr/me" or "/api/qr/[token]/scan". */
  path: string;
  audience: Audience;
  rls: RlsStrategy;
  /** Short description for the audit UI. */
  purpose: string;
  /** Methods the route exposes — for documentation only. */
  methods: ("GET" | "POST" | "PATCH" | "PUT" | "DELETE")[];
  /** Which V-spec section governs this endpoint. */
  governedBy?: string;
  /** Free-form notes — known edge cases, deferred work, etc. */
  notes?: string;
}

// ── Manifest ─────────────────────────────────────────────────────
//
// Not exhaustive — 668 endpoints exist. This is the *governance*
// list: every endpoint that touches PHI, payments, or platform
// state must be enumerated below. New endpoints in those categories
// must be added here BEFORE merge. The audit script in
// scripts/v14-audit.ts walks app/api recursively and warns on any
// route that touches sensitive stores without an entry here.

export const ENDPOINTS: EndpointOwnership[] = [
  // ── Auth (shared) ─────────────────────────────────────────────
  { path: "/api/auth/[...nextauth]", audience: "shared", rls: "public", methods: ["GET", "POST"], purpose: "NextAuth session handlers" },
  { path: "/api/auth/register", audience: "shared", rls: "public", methods: ["POST"], purpose: "Patient + doctor self-signup" },
  { path: "/api/auth/mobile-login", audience: "shared", rls: "public", methods: ["POST"], purpose: "Mobile JWT login" },
  { path: "/api/auth/mobile-me", audience: "shared", rls: "self", methods: ["GET", "PATCH"], purpose: "Mobile session probe + profile patch" },
  { path: "/api/auth/forgot-password", audience: "shared", rls: "public", methods: ["POST"], purpose: "Password reset request" },
  { path: "/api/auth/reset-password", audience: "shared", rls: "public", methods: ["POST"], purpose: "Password reset confirm" },
  { path: "/api/auth/change-password", audience: "shared", rls: "self", methods: ["POST"], purpose: "Self-service password change" },
  { path: "/api/account/delete", audience: "shared", rls: "self", methods: ["POST"], purpose: "Self-delete (Apple 5.1.1(v) + Google requirement)" },

  // ── Patient-app (patient) ─────────────────────────────────────
  { path: "/api/wallet/me", audience: "shared", rls: "self", methods: ["GET"], purpose: "Own wallet + last 100 txns" },
  { path: "/api/consultations", audience: "shared", rls: "self", methods: ["GET", "POST"], purpose: "Own bookings (patient) / queue (doctor)" },
  { path: "/api/consultations/[id]", audience: "shared", rls: "self", methods: ["GET", "PATCH"], purpose: "Consultation detail with canView() guard" },
  { path: "/api/qr/me", audience: "patient", rls: "self", methods: ["GET"], purpose: "Own QR codes; auto-provisions identity + emergency" },
  { path: "/api/qr/issue", audience: "patient", rls: "self", methods: ["POST"], purpose: "Patient creates consent / re-issues identity/emergency" },
  { path: "/api/qr/[token]/revoke", audience: "shared", rls: "self", methods: ["POST"], purpose: "Owner kills the QR; admin can revoke on behalf" },
  { path: "/api/diet-plan", audience: "patient", rls: "self", methods: ["GET"], purpose: "Active diet plan (treatment-template-driven)" },
  { path: "/api/courses/me", audience: "patient", rls: "self", methods: ["GET"], purpose: "My course enrolments" },
  { path: "/api/scorecards", audience: "shared", rls: "self", methods: ["GET"], purpose: "Own scorecard; managers see roll-up via filter" },
  { path: "/api/near-miss", audience: "shared", rls: "self", methods: ["GET", "POST"], purpose: "Submit + list (managers see all; staff see own only)" },

  // ── Pro app — clinical (pro) ──────────────────────────────────
  { path: "/api/opd/issue", audience: "pro", rls: "tenant", methods: ["POST"], purpose: "Reception issues OPD token from a QR scan", governedBy: "V17" },
  { path: "/api/opd/queue", audience: "pro", rls: "tenant", methods: ["GET"], purpose: "OPD display board + reception live queue", governedBy: "V17" },
  { path: "/api/opd/call-next", audience: "pro", rls: "tenant", methods: ["POST"], purpose: "Doctor calls next patient", governedBy: "V17" },
  { path: "/api/opd/[id]/start-consult", audience: "pro", rls: "tenant", methods: ["POST"], purpose: "Auto-fill envelope to encounter form", governedBy: "V17" },
  { path: "/api/opd/[id]/complete", audience: "pro", rls: "tenant", methods: ["POST"], purpose: "Close consult + fire footfall + ABHA sync", governedBy: "V17" },
  { path: "/api/opd/[id]/no-show", audience: "pro", rls: "tenant", methods: ["POST"], purpose: "Mark missed patient", governedBy: "V17" },
  { path: "/api/opd/footfall", audience: "pro", rls: "tenant", methods: ["GET"], purpose: "Per-doctor-per-day footfall roll-up", governedBy: "V17" },
  { path: "/api/qr/[token]/scan", audience: "pro", rls: "token", methods: ["POST"], purpose: "Scanner resolves token + returns scoped payload", governedBy: "V16" },
  { path: "/api/scanner/dispatch", audience: "pro", rls: "role", methods: ["POST"], purpose: "Universal scan dispatcher (12 contexts)", governedBy: "V15" },
  { path: "/api/pharmacy/stock/receive", audience: "pro", rls: "tenant", methods: ["POST"], purpose: "Barcode stock receipt with auto-fill", governedBy: "V15 §4" },
  { path: "/api/pharmacy/stock/inherit", audience: "pro", rls: "tenant", methods: ["POST"], purpose: "V15 §5 pharma→pharmacy inheritance" },
  { path: "/api/pharmacy/stock/link-barcode", audience: "pro", rls: "tenant", methods: ["POST"], purpose: "Link new barcode → drug master" },
  { path: "/api/ppme", audience: "pro", rls: "tenant", methods: ["GET", "POST"], purpose: "PPME admin board", governedBy: "V9 §3" },
  { path: "/api/ppme/[id]", audience: "pro", rls: "tenant", methods: ["GET", "PATCH"], purpose: "PPME test update + photo attach" },
  { path: "/api/ppme/[id]/submit", audience: "pro", rls: "tenant", methods: ["POST"], purpose: "Lock report + run settlement" },
  { path: "/api/ppme/[id]/decide", audience: "pro", rls: "role", methods: ["POST"], purpose: "Insurer approves/rejects" },
  { path: "/api/insurance/claims", audience: "pro", rls: "tenant", methods: ["GET", "POST"], purpose: "Claim submit + list" },
  { path: "/api/insurance/claims/[id]/decide", audience: "pro", rls: "role", methods: ["POST"], purpose: "Insurer adjudicates" },
  { path: "/api/insurance/claims/[id]/pay", audience: "pro", rls: "role", methods: ["POST"], purpose: "Wallet transfer insurer → hospital" },
  { path: "/api/pharma/companies", audience: "pro", rls: "role", methods: ["GET", "POST"], purpose: "Pharma company registry" },
  { path: "/api/pharma/master", audience: "pro", rls: "role", methods: ["GET", "POST"], purpose: "V7 §3.3 drug master contribution" },
  { path: "/api/pharma/mrs", audience: "pro", rls: "role", methods: ["GET", "POST"], purpose: "MR roster (V7 §3.5)" },
  { path: "/api/pharma/adrs", audience: "shared", rls: "self", methods: ["GET", "POST"], purpose: "ADR — clinicians report own; managers see all" },
  { path: "/api/pharma/batches", audience: "pro", rls: "role", methods: ["GET", "POST"], purpose: "V7 §3.6 batch + serial issuance" },
  { path: "/api/pharma/batches/[id]/recall", audience: "pro", rls: "role", methods: ["POST"], purpose: "Recall a batch + every serial" },
  { path: "/api/accountability", audience: "pro", rls: "tenant_admin", methods: ["GET"], purpose: "V13 §2 live feed" },
  { path: "/api/accountability/acknowledge", audience: "pro", rls: "role", methods: ["POST"], purpose: "V13 §4.3 ack breach" },
  { path: "/api/cars", audience: "pro", rls: "tenant_admin", methods: ["GET", "POST"], purpose: "V13 §5 CAR list + open" },
  { path: "/api/cars/[id]", audience: "pro", rls: "tenant_admin", methods: ["GET", "PATCH"], purpose: "CAR detail + advance state" },
  { path: "/api/cross-connections", audience: "pro", rls: "role", methods: ["GET"], purpose: "V6 cross-connection registry introspection" },

  // ── Pro app — finance + ops (pro) ─────────────────────────────
  { path: "/api/exports/[type]", audience: "pro", rls: "role", methods: ["GET"], purpose: "V4 §2 Universal PDF/Excel download engine" },
  { path: "/api/admin/blog/generate", audience: "pro", rls: "role", methods: ["POST"], purpose: "AI article draft — admin/support only", notes: "Auth gate added by V14 audit (was anonymously callable)" },
  { path: "/api/admin/factory-reset", audience: "pro", rls: "super_admin", methods: ["POST"], purpose: "Super-admin demo wipe; requires WIPE confirm token" },
  { path: "/api/admin/super/orgs", audience: "pro", rls: "super_admin", methods: ["GET", "POST"], purpose: "Tenant lifecycle" },
  { path: "/api/admin/privacy/erasures", audience: "pro", rls: "super_admin", methods: ["GET", "POST"], purpose: "GDPR / DPDP erasure queue" },

  // ── Public ────────────────────────────────────────────────────
  { path: "/api/pharma/scan", audience: "public", rls: "token", methods: ["GET", "POST"], purpose: "Legacy anti-counterfeit verifier" },
  { path: "/api/pharma/v7-scan", audience: "public", rls: "token", methods: ["POST"], purpose: "V7 §3.6 anti-counterfeit verifier (rate-limited)" },
  { path: "/api/doctors/public", audience: "public", rls: "public", methods: ["GET"], purpose: "Public doctor directory" },
  { path: "/api/blog", audience: "public", rls: "public", methods: ["GET"], purpose: "Public blog posts (published only)" },
  { path: "/api/contact", audience: "public", rls: "public", methods: ["POST"], purpose: "Marketing contact form" },

  // ── Webhooks (machine-to-machine) ─────────────────────────────
  { path: "/api/webhooks/stripe", audience: "shared", rls: "token", methods: ["POST"], purpose: "Stripe webhook — HMAC verified" },
  { path: "/api/webhooks/razorpay", audience: "shared", rls: "token", methods: ["POST"], purpose: "Razorpay webhook — HMAC verified" },

  // ── Cron jobs (machine, scheduled) ────────────────────────────
  { path: "/api/cron/appointment-reminders", audience: "shared", rls: "token", methods: ["POST"], purpose: "Hourly reminder sweep; CRON_SECRET header gate" },
  { path: "/api/cron/daily-blog", audience: "shared", rls: "token", methods: ["POST"], purpose: "Daily AI article cron" },
  { path: "/api/cron/followup-reminder", audience: "shared", rls: "token", methods: ["POST"], purpose: "Post-discharge follow-up" },
];

// ── Real-time channels (SSE / WebSocket) ─────────────────────────
//
// V14 §3 — every push channel below carries the same auth checks
// the corresponding REST endpoints do. The channel name encodes
// the subscriber scope; the server validates that the subscriber's
// session matches before attaching the listener.

export interface PushChannel {
  /** Channel name pattern. */
  name: string;
  /** Transport. We use SSE everywhere; WebSocket reserved for the
   *  Janus video bridge which is its own infra. */
  transport: "sse" | "websocket";
  /** Who can subscribe. */
  subscriberRoles: string[];
  /** What's broadcast on it. */
  payload: string;
  /** RLS scope — same vocabulary as endpoints. */
  rls: RlsStrategy;
  governedBy?: string;
}

export const CHANNELS: PushChannel[] = [
  {
    name: "live-config:tenant:<tenantId>",
    transport: "sse",
    subscriberRoles: ["any-authenticated"],
    payload: "Tenant configuration changes (feature flags, branding, working hours)",
    rls: "tenant",
    governedBy: "V6 §6",
  },
  {
    name: "home-care:visit:<visitId>",
    transport: "sse",
    subscriberRoles: ["patient (own visit only)"],
    payload: "Provider location pings (lat/lng/status) every 30s during home-care visits",
    rls: "self",
    governedBy: "V4 §4.1 home-visit workflow",
  },
  {
    name: "opd:queue:<clinicId>",
    transport: "sse",
    subscriberRoles: ["staff", "doctor", "admin"],
    payload: "OPD token state changes — for display board push (currently polled, SSE upgrade pending)",
    rls: "tenant",
    governedBy: "V17",
  },
  {
    name: "accountability:live:<tenantId>",
    transport: "sse",
    subscriberRoles: ["admin", "support", "hr"],
    payload: "V13 live accountability feed (currently 10s polled, SSE upgrade pending)",
    rls: "tenant_admin",
    governedBy: "V13 §2.2",
  },
  {
    name: "video-call:<roomId>",
    transport: "websocket",
    subscriberRoles: ["doctor", "patient (matched on consultation)"],
    payload: "Janus WebRTC signalling for telemedicine consults",
    rls: "self",
    governedBy: "V4 §4.1 telemedicine",
  },
];

// ── Helpers ──────────────────────────────────────────────────────

export function summary() {
  const byAudience: Record<Audience, number> = { patient: 0, pro: 0, shared: 0, public: 0 };
  const byRls: Record<RlsStrategy, number> = { self: 0, tenant: 0, tenant_admin: 0, super_admin: 0, role: 0, public: 0, token: 0 };
  for (const e of ENDPOINTS) {
    byAudience[e.audience]++;
    byRls[e.rls]++;
  }
  return { total: ENDPOINTS.length, byAudience, byRls, channels: CHANNELS.length };
}
