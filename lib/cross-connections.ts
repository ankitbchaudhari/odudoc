// V6 of the Master Spec — 28 cross-connections.
//
// A central typed event bus + handler registry. Every action that
// triggers downstream side-effects in V4-V13 surfaces fires an event
// through emit() rather than calling each downstream service inline.
// This keeps the call sites cheap and the side-effect graph explicit.
//
// Why a bus instead of direct imports:
//   1. The same action may fire from multiple call sites (a patient
//      registers via web, mobile, OAuth, or admin-create). One emit()
//      point per action keeps the side-effect list consistent.
//   2. Some downstream effects depend on features that haven't shipped
//      yet (e.g. ABHA lookup). The bus dispatches to a stub handler
//      that no-ops until the feature lands — no rewiring needed.
//   3. V13 §1 wants every accountable action captured. The bus is the
//      single place we tee into the accountability log, so we never
//      forget a category.
//   4. Cross-connection 15 (V6 §5.16) — QMS pulls metrics from every
//      module. A single observable event stream is the cleanest input.
//
// All handlers run fire-and-forget — a downstream failure must never
// break the primary action. Each handler swallows its own errors and
// logs via lib/log so the caller doesn't have to wrap emit() in try.

import { recordEvent } from "@/lib/accountability-store";
import { ensureWallet } from "@/lib/wallet-store";
import { log } from "@/lib/log";

// ── The 28 cross-connection trigger names ─────────────────────────
//
// Each one is documented in lib/drizzle/V12.md and V6 of the spec.
// Adding a new connection = add the type below + a handler in
// HANDLERS, then add the emit() at the call site.

export type CrossConnection =
  // §5.2 — Patient registration: audit, wallet, family invite, ABHA, marketing
  | "patient.registered"
  // §5.3 — Staff onboarding: scorecard init, manager notification, role tile
  | "staff.account.created"
  // §5.4 — Department created: org chart refresh, HOD notification
  | "department.created"
  // §5.5 — Ward/bed created: bed-census refresh, housekeeping queue
  | "ward_bed.created"
  // §5.6 — Appointment booked: doctor notif, calendar block, wallet hold
  | "appointment.booked"
  // §5.7 — Consultation completed: encounter, payment release, survey
  | "consultation.completed"
  // §5.8 — IPD admission: bed assigned, encounter open, MAR initialised
  | "ipd.admission.opened"
  // §5.9 — Discharge: invoice, claim auto-assembled, follow-up, bed free
  | "ipd.discharge.completed"
  // §5.10 — Lab result entered: critical-value escalation, encounter update
  | "lab.result.entered"
  // §5.11 — Blood cross-match + transfusion: audit, donor link, expiry
  | "blood.cross_match.issued"
  // §5.12 — Purchase order + supply chain: vendor hold, GRN, low-stock reorder
  | "purchase_order.created"
  // §5.13 — Staff leave approved: roster gap, replacement candidates
  | "staff.leave.approved"
  // §5.14 — Incident reported: CAR auto-open, pattern review, audit
  | "incident.reported"
  // §5.15 — Asset management: maintenance schedule, depreciation
  | "asset.created"
  // §5.16 — QMS data feeds: CSAT/NPS aggregation across modules
  | "qms.metric.captured"
  // §5.17 — Insurance claim submitted: tenant notify, document bundle
  | "insurance.claim.submitted"
  // §5.18 — Insurance claim paid: hospital wallet credit (already in V7)
  | "insurance.claim.paid"
  // §5.19 — Wallet transfer: V13 accountability (already in commit a29bafa)
  | "wallet.transfer.completed"
  // §5.20 — PPME submitted: settlement (already in V9 §3 commit)
  | "ppme.submitted"
  // §5.21 — Equipment order: warranty registration, manufacturer notify
  | "equipment.ordered"
  // §5.22 — Course enrolled: V13 event, CME tracker stub
  | "course.enrolled"
  // §5.23 — Course completed: CME credit, blockchain cert, provider payout
  | "course.completed"
  // §5.24 — Near-miss reported: pattern aggregator, weekly review
  | "near_miss.reported"
  // §5.25 — CAR opened: assignee notification, escalation timer
  | "car.opened"
  // §5.26 — Insurer empanelment approved: hospital settings update
  | "empanelment.approved"
  // §5.27 — Pre-auth approved: patient notified, admission unblocked
  | "pre_auth.approved"
  // §5.28 — Drug master updated: prescription engine cache refresh, ADR flag
  | "drug_master.updated";

/** Any context — handlers narrow the shape themselves. Loose typing
 *  here keeps emit() ergonomic at the call site. */
export type CrossContext = Record<string, unknown>;

type Handler = (ctx: CrossContext) => Promise<void> | void;

// ── Handlers ─────────────────────────────────────────────────────
//
// Every cross-connection has an entry. If the downstream service
// doesn't exist yet, the handler logs a placeholder via log.info so
// the wire is visible in production logs without breaking anything.

const HANDLERS: Record<CrossConnection, Handler[]> = {
  // §5.2 patient.registered — fan-out (V6 §5.2)
  "patient.registered": [
    async (ctx) => {
      const userId = String(ctx.userId || ctx.email || "");
      if (!userId) return;
      // Wallet seed — every patient gets a wallet on registration so
      // their first booking doesn't race the wallet bootstrap.
      try { await ensureWallet("patient", userId, String(ctx.currency || "INR")); }
      catch (e) { log.warn("xc.patient_wallet_seed_warn", { error: String(e) }); }
    },
    async (ctx) => {
      // V13 accountability
      await recordEvent({
        category: "system",
        action: "patient.registered",
        actorEmail: String(ctx.email || "unknown"),
        actorRole: "patient",
        subjectKind: "user",
        subjectId: String(ctx.userId || ctx.email || ""),
        summary: `Patient registered (${ctx.source || "web"})`,
      }).catch(() => {/* ignore */});
    },
    async (ctx) => {
      // Family-graph invite: if the phone matches an existing family
      // member stub, link automatically. Stubbed until the
      // family_members table is populated. Logs intent so it's visible
      // in the audit trail.
      if (ctx.phone) {
        log.info("xc.family_phone_match_check", { phone: String(ctx.phone), userId: ctx.userId });
      }
    },
    async (ctx) => {
      // ABHA / national health ID lookup stub. Real wire-up needs the
      // ABDM SDK + consent token. Surfaces as a TODO so a sweep finds it.
      if (ctx.country === "IN") {
        log.info("xc.abha_lookup_todo", { userId: ctx.userId });
      }
    },
  ],

  // §5.3 staff.account.created
  "staff.account.created": [
    async (ctx) => {
      await recordEvent({
        category: "admin",
        action: "staff.account.created",
        actorEmail: String(ctx.createdByEmail || "system"),
        actorRole: String(ctx.createdByRole || "admin"),
        subjectKind: "user",
        subjectId: String(ctx.userId || ctx.email || ""),
        tenantId: ctx.tenantId ? String(ctx.tenantId) : undefined,
        summary: `Staff account created · role=${ctx.role} · email=${ctx.email}`,
      }).catch(() => {});
    },
    async (ctx) => {
      // Manager notification — surfaces in the V5 manager dashboard
      // "Needs your attention" feed. Real push lands when the
      // notification fan-out service ships.
      log.info("xc.manager_notify_new_staff", { tenantId: ctx.tenantId, role: ctx.role, email: ctx.email });
    },
  ],

  // §5.4 department.created
  "department.created": [
    async (ctx) => {
      await recordEvent({
        category: "admin",
        action: "department.created",
        actorEmail: String(ctx.actorEmail || "admin"),
        actorRole: String(ctx.actorRole || "admin"),
        tenantId: ctx.tenantId ? String(ctx.tenantId) : undefined,
        subjectKind: "department",
        subjectId: String(ctx.departmentId || ""),
        summary: `Department created: ${ctx.name} (${ctx.code})`,
      }).catch(() => {});
    },
  ],

  // §5.5 ward/bed created
  "ward_bed.created": [
    async (ctx) => {
      await recordEvent({
        category: "admin",
        action: "ward_bed.created",
        actorEmail: String(ctx.actorEmail || "admin"),
        actorRole: String(ctx.actorRole || "admin"),
        tenantId: ctx.tenantId ? String(ctx.tenantId) : undefined,
        subjectKind: ctx.kind === "bed" ? "bed" : "ward",
        subjectId: String(ctx.id || ""),
        summary: `${ctx.kind} created: ${ctx.label}`,
      }).catch(() => {});
    },
    async () => {
      // Bed-census refresh — invalidate cached counts on the manager +
      // CEO dashboards. Stubbed until the cache layer lands.
    },
  ],

  // §5.6 appointment.booked — V6 §5.6
  "appointment.booked": [
    async (ctx) => {
      await recordEvent({
        category: "clinical",
        action: "appointment.booked",
        actorEmail: String(ctx.patientEmail || "patient"),
        subjectKind: "booking",
        subjectId: String(ctx.bookingId || ""),
        summary: `${ctx.patientName} booked ${ctx.doctorName} at ${ctx.timeSlot}`,
        after: { fee: ctx.fee, currency: ctx.currency || "INR" },
      }).catch(() => {});
    },
    async (ctx) => {
      // Doctor notification — already handled by the call-site via
      // notifyAppointmentBooked + sent-dm. Keep this stub so future
      // notification channels (WhatsApp, push) can register handlers
      // without re-touching the booking route.
      log.info("xc.doctor_appointment_notif_dispatched", { bookingId: ctx.bookingId, doctorId: ctx.doctorId });
    },
    async (ctx) => {
      // V16 §2.1 — auto-issue an appointment QR. Valid 30 min before
      // slot until 2h after. Patient sees it in their My QR codes
      // dashboard immediately + show it at reception to check in.
      if (!ctx.bookingId || !ctx.patientEmail || !ctx.timeSlot) return;
      try {
        // Late require — qr-store imports accountability + persistent
        // array, both of which sit deep in the dep tree.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const qr = require("@/lib/qr-store") as typeof import("@/lib/qr-store");
        await qr.issueAppointmentQr({
          bookingId: String(ctx.bookingId),
          patientId: String(ctx.patientEmail),
          patientEmail: String(ctx.patientEmail),
          // timeSlot in V6 §5.6 ctx is the slot string like "10:30 AM"
          // — if a full ISO is available downstream this gets refined.
          // For demo we treat it as "now + 1h" to give a usable window.
          timeSlotStartAt: ctx.timeSlotStartAt ? String(ctx.timeSlotStartAt) : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        });
      } catch (e) {
        log.warn("xc.appointment_qr_issue_warn", { error: String(e) });
      }
    },
  ],

  // §5.7 consultation.completed
  "consultation.completed": [
    async (ctx) => {
      await recordEvent({
        category: "clinical",
        action: "consultation.completed",
        actorEmail: String(ctx.doctorEmail || "doctor"),
        actorRole: "doctor",
        subjectKind: "consultation",
        subjectId: String(ctx.consultationId || ""),
        summary: `Consultation completed for ${ctx.patientName} by ${ctx.doctorName}`,
      }).catch(() => {});
    },
    async (ctx) => {
      // Payment release: shift the held fee out of the patient wallet's
      // hold bucket and into the doctor wallet. Handled inline today
      // by the consultation status flip; surfaced here for visibility.
      log.info("xc.payment_release_pending", { consultationId: ctx.consultationId });
    },
    async (ctx) => {
      // Satisfaction survey trigger (V13 §6 + QMS feeds). Survey
      // template + delivery channel set per-tenant; stub logs the intent.
      log.info("xc.csat_survey_queued", { consultationId: ctx.consultationId, patientEmail: ctx.patientEmail });
    },
  ],

  // §5.8 IPD admission
  "ipd.admission.opened": [
    async (ctx) => {
      await recordEvent({
        category: "clinical",
        action: "ipd.admission.opened",
        actorEmail: String(ctx.admittingDoctorEmail || "doctor"),
        subjectKind: "admission",
        subjectId: String(ctx.admissionId || ""),
        tenantId: ctx.tenantId ? String(ctx.tenantId) : undefined,
        summary: `IPD admission opened for ${ctx.patientName} at bed ${ctx.bedLabel}`,
      }).catch(() => {});
    },
  ],

  // §5.9 discharge
  "ipd.discharge.completed": [
    async (ctx) => {
      await recordEvent({
        category: "clinical",
        action: "ipd.discharge.completed",
        actorEmail: String(ctx.dischargingDoctorEmail || "doctor"),
        subjectKind: "discharge",
        subjectId: String(ctx.dischargeId || ""),
        summary: `Discharge completed for ${ctx.patientName}`,
      }).catch(() => {});
    },
    async (ctx) => {
      // Auto-assemble claim bundle if the admission was empanelled.
      log.info("xc.claim_bundle_auto_assemble", { dischargeId: ctx.dischargeId, policyNumber: ctx.policyNumber });
    },
    async (ctx) => {
      // Follow-up reminder scheduled.
      log.info("xc.followup_scheduled", { dischargeId: ctx.dischargeId, days: ctx.followUpInDays || 14 });
    },
  ],

  // §5.10 lab result
  "lab.result.entered": [
    async (ctx) => {
      await recordEvent({
        category: "clinical",
        action: "lab.result.entered",
        actorEmail: String(ctx.recordedByEmail || "lab"),
        actorRole: String(ctx.recordedByRole || "lab"),
        subjectKind: "lab_result",
        subjectId: String(ctx.resultId || ""),
        // Mark as critical severity if the flag says so — V13 §3
        // 30-minute rule keys off this.
        severity: ctx.flag === "critical_high" || ctx.flag === "critical_low" ? "critical" : "info",
        summary: `Lab ${ctx.code} ${ctx.flag || ""} for patient ${ctx.patientId}`,
        after: { code: ctx.code, value: ctx.valueText, flag: ctx.flag },
      }).catch(() => {});
    },
  ],

  // §5.11 blood cross-match
  "blood.cross_match.issued": [
    async (ctx) => {
      await recordEvent({
        category: "clinical",
        action: "blood.cross_match.issued",
        actorEmail: String(ctx.issuedByEmail || "blood_bank"),
        actorRole: "blood_bank",
        subjectKind: "transfusion",
        subjectId: String(ctx.transfusionId || ""),
        severity: "high",
        summary: `${ctx.units} units ${ctx.bloodGroup} issued for ${ctx.patientName}`,
      }).catch(() => {});
    },
  ],

  // §5.12 purchase order
  "purchase_order.created": [
    async (ctx) => {
      await recordEvent({
        category: "financial",
        action: "purchase_order.created",
        actorEmail: String(ctx.actorEmail || "supply_chain"),
        subjectKind: "purchase_order",
        subjectId: String(ctx.poId || ""),
        summary: `PO ${ctx.poId} to ${ctx.vendorName} · ${ctx.totalCents ? `${(Number(ctx.totalCents) / 100).toLocaleString()} ${ctx.currency || "INR"}` : "amount tbd"}`,
      }).catch(() => {});
    },
  ],

  // §5.13 staff leave approved
  "staff.leave.approved": [
    async (ctx) => {
      await recordEvent({
        category: "admin",
        action: "staff.leave.approved",
        actorEmail: String(ctx.approvedByEmail || "manager"),
        subjectKind: "leave",
        subjectId: String(ctx.leaveId || ""),
        summary: `Leave approved for ${ctx.staffEmail}: ${ctx.fromDate} → ${ctx.toDate}`,
      }).catch(() => {});
    },
    async () => {
      // Roster gap detection stub. Real fan-out finds gaps in the
      // auto-roster and surfaces replacement candidates.
    },
  ],

  // §5.14 incident reported
  "incident.reported": [
    async (ctx) => {
      await recordEvent({
        category: "clinical",
        action: "incident.reported",
        actorEmail: String(ctx.reporterEmail || "anonymous"),
        subjectKind: "incident",
        subjectId: String(ctx.incidentId || ""),
        severity: (ctx.severity as "low" | "medium" | "high" | "critical" | undefined) || "medium",
        summary: String(ctx.summary || "Incident reported"),
      }).catch(() => {});
    },
  ],

  // §5.15 asset created
  "asset.created": [
    async (ctx) => {
      await recordEvent({
        category: "admin",
        action: "asset.created",
        actorEmail: String(ctx.actorEmail || "biomedical"),
        subjectKind: "asset",
        subjectId: String(ctx.assetId || ""),
        summary: `Asset ${ctx.name} added at ${ctx.location}`,
      }).catch(() => {});
    },
  ],

  // §5.16 QMS metric
  "qms.metric.captured": [
    async (ctx) => {
      log.info("xc.qms_metric", { metric: ctx.metric, value: ctx.value, tenantId: ctx.tenantId });
    },
  ],

  // §5.17 insurance claim submitted
  "insurance.claim.submitted": [
    async (ctx) => {
      await recordEvent({
        category: "financial",
        action: "insurance.claim.submitted",
        actorEmail: String(ctx.actorEmail || "billing"),
        subjectKind: "claim",
        subjectId: String(ctx.claimId || ""),
        summary: `Claim ${ctx.claimId} submitted to ${ctx.insurerName} for ${ctx.patientName}`,
      }).catch(() => {});
    },
  ],

  // §5.18 insurance claim paid — already wired in V7 §2 commit 37b13bd
  "insurance.claim.paid": [
    async (ctx) => {
      log.info("xc.claim_paid_post_settlement", { claimId: ctx.claimId, hospitalId: ctx.hospitalId });
    },
  ],

  // §5.19 wallet transfer — already writes to V13 in commit a29bafa
  "wallet.transfer.completed": [
    async (ctx) => {
      // Most wallet transfers already emit accountability via the wallet
      // store. Keep this handler as the explicit V6 connection point so
      // future side-effects (FX rate logging, anti-fraud signals, large
      // transfer alerts) attach here.
      if (Number(ctx.amountCents) >= 10_000_000) {
        // > ₹1L transfer — surface to manager dashboard.
        log.info("xc.large_transfer_flag", { amountCents: ctx.amountCents, fromWalletId: ctx.fromWalletId, toWalletId: ctx.toWalletId });
      }
    },
  ],

  // §5.20 PPME submitted — settlement already in lib/ppme-store.submitPpme
  "ppme.submitted": [
    async (ctx) => {
      log.info("xc.ppme_post_submit_hook", { ppmeId: ctx.ppmeId, insurerId: ctx.insurerId });
    },
  ],

  // §5.21 equipment ordered
  "equipment.ordered": [
    async (ctx) => {
      // Warranty registration: already inline in equipment-marketplace-
      // store.placeOrder. Connection makes it explicit + lets future
      // notification handlers register here.
      log.info("xc.equipment_warranty_registered", { orderId: ctx.orderId, productId: ctx.productId });
    },
    async (ctx) => {
      // Manufacturer notification — push to their dashboard's
      // "dispatches today" tile. Real notification lands with V7 §3
      // manufacturer panel.
      log.info("xc.manufacturer_order_notify", { manufacturerId: ctx.manufacturerId, orderId: ctx.orderId });
    },
  ],

  // §5.22 course enrolled
  "course.enrolled": [
    async (ctx) => {
      // CME tracker stub — for paid CME courses, log against the
      // doctor's credit account. Real wire to cme_credits table lands
      // with the table-cutover commit.
      if (ctx.cmeCredits) {
        log.info("xc.cme_credit_pending_completion", { courseId: ctx.courseId, studentEmail: ctx.studentEmail, credits: ctx.cmeCredits });
      }
    },
  ],

  // §5.23 course completed
  "course.completed": [
    async (ctx) => {
      await recordEvent({
        category: "admin",
        action: "course.completed",
        actorEmail: String(ctx.studentEmail || "student"),
        subjectKind: "course",
        subjectId: String(ctx.courseId || ""),
        summary: `${ctx.studentName} completed course ${ctx.courseTitle}`,
      }).catch(() => {});
    },
    async (ctx) => {
      // Blockchain certificate generation stub.
      log.info("xc.blockchain_cert_queued", { courseId: ctx.courseId, studentEmail: ctx.studentEmail });
    },
  ],

  // §5.24 near-miss reported (already shipped in V13 §7)
  "near_miss.reported": [
    async (ctx) => {
      log.info("xc.near_miss_pattern_aggregate", { domain: ctx.domain, severity: ctx.severity });
    },
  ],

  // §5.25 CAR opened (already shipped in V13 §5)
  "car.opened": [
    async (ctx) => {
      // Escalation timer — the V13 §4 escalation chain runs as a cron
      // that looks at carUpdates. Connection point makes the trigger
      // visible.
      log.info("xc.car_escalation_timer_set", { carId: ctx.carId, respondByAt: ctx.respondByAt });
    },
  ],

  // §5.26 empanelment approved
  "empanelment.approved": [
    async (ctx) => {
      await recordEvent({
        category: "admin",
        action: "empanelment.approved",
        actorEmail: String(ctx.decidedByEmail || "insurer"),
        subjectKind: "empanelment",
        subjectId: String(ctx.empanelmentId || ""),
        summary: `Empanelment approved: ${ctx.hospitalName} ↔ ${ctx.insurerName}`,
      }).catch(() => {});
    },
  ],

  // §5.27 pre-auth approved
  "pre_auth.approved": [
    async (ctx) => {
      await recordEvent({
        category: "financial",
        action: "pre_auth.approved",
        actorEmail: String(ctx.decidedByEmail || "insurer"),
        subjectKind: "pre_auth",
        subjectId: String(ctx.preAuthId || ""),
        summary: `Pre-auth ${ctx.preAuthId} approved for ${ctx.patientName} · cap ${ctx.approvedCapCents ? ((Number(ctx.approvedCapCents)) / 100).toLocaleString() : "?"} ${ctx.currency || "INR"}`,
      }).catch(() => {});
    },
  ],

  // §5.28 drug master updated
  "drug_master.updated": [
    async (ctx) => {
      log.info("xc.drug_master_cache_invalidate", { drugInn: ctx.drugInn, contributedByPharmaId: ctx.contributedByPharmaId });
    },
  ],
};

// ── Public API ───────────────────────────────────────────────────

/**
 * Fire a cross-connection event. Fire-and-forget — never throws.
 * Always returns immediately; the bus dispatches handlers in the
 * background.
 *
 * Usage at call sites:
 *
 *   emit("appointment.booked", {
 *     bookingId: booking.id,
 *     patientName: booking.patientName,
 *     doctorName: booking.doctorName,
 *     timeSlot: booking.timeSlot,
 *     fee: booking.fee,
 *   });
 */
export function emit(event: CrossConnection, ctx: CrossContext): void {
  const handlers = HANDLERS[event];
  if (!handlers || handlers.length === 0) return;
  // Fire each handler independently — one failing handler must not
  // skip the others. setImmediate (or Promise.resolve().then if not
  // available) defers off the hot path so the caller returns to the
  // user immediately.
  for (const handler of handlers) {
    Promise.resolve().then(async () => {
      try {
        await handler(ctx);
      } catch (e) {
        log.warn("xc.handler_failed", { event, error: String(e) });
      }
    });
  }
}

/** Synchronous variant — waits for all handlers to settle. Useful in
 *  tests + when you genuinely need the side-effects before responding
 *  (e.g. wallet seed before returning a JWT). Use sparingly. */
export async function emitAndWait(event: CrossConnection, ctx: CrossContext): Promise<void> {
  const handlers = HANDLERS[event];
  if (!handlers || handlers.length === 0) return;
  await Promise.all(
    handlers.map(async (h) => {
      try { await h(ctx); }
      catch (e) { log.warn("xc.handler_failed", { event, error: String(e) }); }
    }),
  );
}

/** Introspection — used by the admin panel to show the cross-connection
 *  map. */
export function listConnections(): { event: CrossConnection; handlerCount: number }[] {
  return (Object.keys(HANDLERS) as CrossConnection[]).map((event) => ({
    event,
    handlerCount: HANDLERS[event].length,
  }));
}
