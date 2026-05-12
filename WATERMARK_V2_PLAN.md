# §13 Watermark v2 — Plan for next session

What we have today vs. what the spec asks for, and the exact work to
close the gap. Read this before starting the session; estimate at
the bottom.

---

## What v1 ships today

| Surface | Watermark | Behavior |
|---|---|---|
| Patient document viewer (`/dashboard/documents/view/[id]`) | ✅ Inline CSS diagonal overlay | Encodes patient ID + viewer IP + viewedAt |
| Invoice viewer (`/invoice/[orgId]/[id]`) | ✅ Inline CSS diagonal overlay | Same encoding |
| `<ReportWatermark>` shared component | ✅ Available for new report viewers | Pure CSS, prints with document, blocks Ctrl+S |
| `/api/documents` and `/api/invoices/render` | ✅ Return `watermark` payload + `denyDownload: true` for corporate roles | Server gate |

Audit log of every view/print event is wired in `lib/audit/store`.

---

## What spec §13 demands but v1 doesn't deliver

| Gap | Where it bites |
|---|---|
| **A. DICOM image overlay** | Radiology images viewed in admin or doctor workspaces have no watermark. A doctor can screenshot a chest X-ray and walk it out. |
| **B. Surgical / procedure video overlay** | Same — videos play without any watermark. |
| **C. Screen-recording detection** | A clever user records the patient document with OBS / iPhone screen recorder. Currently undetected. |
| **D. Anomaly detection — bulk access block** | Spec §13: "Automated export or systematic bulk access detected → session suspended." Today audit log records but nothing blocks. |
| **E. Watermark on print output across all PDF-rendered reports** | Currently only browser-viewer watermark. Direct PDF download by patient (allowed) has no per-viewer watermark. |

---

## Engineering plan (in order of leverage)

### Phase 1 — DICOM overlay (A)

**Existing code:** `lib/dicom-annotations-store.ts` exists but no
viewer is wired. Looks like a stub.

**Plan:**
1. Pick viewer library: **Cornerstone3D** (industry standard, Apache 2.0, mature).
   - npm package: `@cornerstonejs/core` + `@cornerstonejs/dicom-image-loader`
   - Bundle hit: ~400 KB gzipped
2. Build `app/dashboard/imaging/[studyId]/page.tsx` — client component:
   - Loads DICOM bytes via signed URL from MinIO/blob storage
   - Renders into a Cornerstone viewport
   - Overlays a SECOND canvas on top with diagonal text repeated
     (same `ReportWatermark` component, just rendered over a canvas)
   - Watermark text on every frame including zoom + cine playback
3. Add admin variant at `app/admin/radiology/[studyId]/page.tsx`
   for doctor-side viewing — same component, server checks role
   and forces `denyDownload`
4. Block Cornerstone's built-in download tools when actor is corporate

**Effort:** 2-3 days. Bulk is wiring Cornerstone correctly + handling
multi-frame DICOM. Watermark itself is trivial once the canvas is there.

### Phase 2 — Video overlay (B)

**Existing code:** `lib/surgery-video/` has upload + storage. Currently
served via plain `<video src>` tags.

**Plan:**
1. Replace `<video>` with a custom player component:
   - HTML5 `<video>` underneath
   - Absolutely-positioned `<div>` with `pointer-events: none` containing
     the repeating watermark text (same `ReportWatermark`)
   - The watermark div is a sibling of `<video>`, positioned with
     `position: absolute; inset: 0; z-index: 10`
2. **Critical**: prevent the browser's native "download" / "picture-in-picture"
   from giving an un-watermarked stream:
   - Add `controlsList="nodownload nofullscreen noremoteplayback"` to `<video>`
   - Add `disablePictureInPicture` attribute
   - Set CSP `media-src` to block external embed
3. For the strongest variant: **server-side FFmpeg watermark burn-in**.
   When a corporate user requests a video, transcode on-the-fly with
   `ffmpeg -i input.mp4 -vf "drawtext=text='userId/ip/time'" output.mp4`.
   Cache result for 1 hour per (user, video) combo.
   - Cost: ~30s CPU per video first view, free on cached views
   - Implementation: separate route `/api/surgery-video/[id]/burn`
     that streams the watermarked output

**Effort:** 1-2 days for CSS overlay version (Phase 2a), +2 days for
FFmpeg burn-in (Phase 2b). Recommend 2a first, 2b only if compliance
demands it.

### Phase 3 — Screen-recording detection (C)

**Reality check:** This is hard. There's no perfect web API for it.
Best you can do is heuristics:

1. **Page Visibility API** — if a screen recorder is active, the OS
   typically fires `visibilitychange` events. Detect rapid changes.
2. **Media Session API** — query `navigator.mediaSession` for active
   media; some screen recorders register here.
3. **Screen Capture API detection (Chrome only)** — listen for
   `display-capture` permission changes via Permissions API.
4. **Frame rate degradation** — recording typically halves the page's
   frame rate. Use `requestAnimationFrame` to measure FPS, flag if it
   drops sharply.
5. When detected: activate a **full-screen opaque watermark** that
   covers the document with a giant `Patient ID + IP + time`. The
   recording captures the watermark, not the document.

**Plan:**
- Build `components/admin/ScreenRecordingGuard.tsx`
- Mount inside `ReportWatermark` when `denyDownload === true`
- Wire `recordAuditEvent` on every detection so super-admin sees attempts

**Effort:** 1-2 days. Mostly cross-browser testing.

**Honest caveat:** A user with two devices (phone pointed at laptop screen)
defeats every web-based scheme. This deters casual leakage, not determined
exfiltration.

### Phase 4 — Bulk-access anomaly block (D)

**Existing code:** `lib/audit/store` records events. No anomaly detector.

**Plan:**
1. Add `lib/audit/anomaly-detector.ts`:
   - Reads recent audit events for the actor
   - Rules:
     - >50 patient records viewed in 1 hour → flag
     - >200 viewed in 24 hours → block
     - Access pattern outside actor's normal working hours
       (compare to per-actor weekday/hour histogram) → flag
     - First-time access to >10 patients in same hour → flag
   - Severity levels: `info`, `flag`, `block`
2. Call detector on every `recordAuditEvent` (synchronous, in-memory).
   If `block`, write a session-invalidation token to the user's session
   and return `Forbidden` on next request.
3. Add `/admin/security/anomalies` page so super-admin sees flagged
   sessions with timeline.

**Effort:** 2-3 days. Bulk is the per-actor working-hours histogram
which needs a couple of weeks of data to be useful — could ship the
rule-based detector first, add the histogram later.

### Phase 5 — Print-output watermark uniformity (E)

**Existing code:** Browser print uses CSS `@media print`. Server-side
PDF generation uses... let me check this in the session.

**Plan:**
1. Identify every server-side PDF generator (invoice, prescription,
   lab report). Most likely `lib/invoice-render/build.ts` and similar.
2. Inject a WeasyPrint-style watermark into the HTML template before
   PDF rendering. Or, if WeasyPrint isn't in use, switch to a JS PDF
   library like `pdf-lib` and burn the watermark in.
3. Ensure every PDF carries the **viewer's IP + timestamp**, not just
   the patient's ID — so two different downloads of the same invoice
   carry different watermarks.

**Effort:** 1 day if PDF stack is already settled, 3 days if migration
to a new PDF library is needed.

---

## Total estimate

Conservatively: **8-12 working days** to ship all five phases.

Aggressive split — if you only do the high-impact pieces:
- Phase 1 (DICOM): 2-3 days — closes the biggest compliance gap
- Phase 2a (video CSS overlay): 1 day — quick win
- Phase 4 (anomaly detection): 2 days — compliance auditor catnip
- Skip 2b, 3, 5 unless specific compliance need

That's a **5-6 day minimum viable v2**.

---

## External dependencies

| Phase | External need | Cost |
|---|---|---|
| 1 DICOM | None — Cornerstone is open source | $0 |
| 2a video CSS | None | $0 |
| 2b FFmpeg | FFmpeg installed on Vercel function or external worker | $0 (Vercel) or VPS ~$5/mo |
| 3 screen-recording | None | $0 |
| 4 anomaly detection | None | $0 |
| 5 PDF watermark | Maybe switch from current renderer to `pdf-lib` | $0 |

**Zero new external services. Zero new credentials.** That's why this is
the right pick from the four spec-§ candidates.

---

## Risks I'd want to confirm before starting

1. **Does OduDoc actually have DICOM files in production yet?** If no,
   building Phase 1 is premature — defer until real radiology partners
   are onboarded.
2. **What PDF renderer is in use?** Need to read the code to know. If
   it's WeasyPrint via Python service, that's a different fix from
   if it's `pdf-lib` JS.
3. **Are there existing screenshots / videos with watermark in production
   that I shouldn't break?** Need to test old documents render correctly
   after Phase 1-2 land.

I'll answer #1 and #2 at session start. #3 is mitigated by deploying
behind a feature flag for the first 24 hours.

---

## Pre-session checklist for you

Before we start the §13 v2 session, please:

- [ ] Confirm you actually have DICOM files in MinIO / blob storage
      (if not, we skip Phase 1 and start with video)
- [ ] Tell me the actual storage location for DICOM + video files (which
      bucket, which signing scheme)
- [ ] Decide: include Phase 2b (FFmpeg server burn-in)? Yes if you want
      the strongest variant; no if CSS overlay is enough
- [ ] Decide: include Phase 4 (anomaly detector with auto-block)? Yes if
      compliance is asking; no if it's just nice-to-have

Tell me your answers and I'll start the v2 work fresh next session.
