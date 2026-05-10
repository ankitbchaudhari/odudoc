"use client";

// Biometric enrollment kiosk for hospital reception.
//
// Two paths, both browser-native — no USB SDK needed:
//   1. WebAuthn fingerprint — uses the platform authenticator
//      (Win Hello / Touch ID / Android fingerprint). Returns an
//      attestation; we hash the credential ID + raw key and send
//      that as the templateHash.
//   2. Face capture via getUserMedia — captures one frame, hashes
//      the canvas bytes with HMAC-SHA-256 keyed on the per-user
//      salt issued by /api/biometric/enroll. NOTE: this is a
//      simple pixel-hash demo; production would run a face-embedding
//      model (FaceNet/ArcFace/etc.) and hash the embedding so
//      lighting/angle changes don't break match.
//
// Consent gating: the consentRecordId must be entered before
// enrollment starts. The /api/biometric/enroll endpoint rejects
// the POST without it.

import { useEffect, useRef, useState } from "react";

type Mode = "fingerprint" | "face";

export default function BiometricKioskPage() {
  const [orgId, setOrgId] = useState("");
  const [patientUserId, setPatientUserId] = useState("");
  const [consentRecordId, setConsentRecordId] = useState("");
  const [mode, setMode] = useState<Mode>("fingerprint");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [phase, setPhase] = useState<"idle" | "scanning" | "enrolling">("idle");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setOrgId(localStorage.getItem("odudoc:active-org") || "");
  }, []);

  // Tear down camera when component unmounts or mode flips.
  useEffect(() => {
    return () => stopCamera();
  }, []);
  useEffect(() => {
    if (mode !== "face") stopCamera();
  }, [mode]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startCamera = async () => {
    if (streamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 480, height: 360 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      setMsg({ kind: "err", text: `Camera access denied: ${(e as Error).message}` });
    }
  };

  // Per-user salt fetched from the enroll endpoint.
  const fetchSalt = async (kind: Mode): Promise<string | null> => {
    const r = await fetch(`/api/biometric/enroll?kind=${kind}`);
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      setMsg({ kind: "err", text: `Could not start enrollment: ${e.error || r.status}` });
      return null;
    }
    const d = await r.json();
    return String(d.salt);
  };

  // HMAC-SHA-256 a buffer with a string key, return base64.
  const hmacB64 = async (key: string, data: ArrayBuffer | Uint8Array): Promise<string> => {
    const enc = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw", enc.encode(key),
      { name: "HMAC", hash: "SHA-256" },
      false, ["sign"]
    );
    const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
    // Cast through ArrayBuffer to satisfy the BufferSource type.
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    return btoa(String.fromCharCode(...new Uint8Array(sig)));
  };

  const enrollFingerprint = async () => {
    if (!orgId || !patientUserId.trim() || !consentRecordId.trim()) {
      setMsg({ kind: "err", text: "Org, patient userId, and consent record id are all required." });
      return;
    }
    if (typeof PublicKeyCredential === "undefined") {
      setMsg({ kind: "err", text: "WebAuthn not supported on this browser." });
      return;
    }
    setBusy(true); setMsg(null); setPhase("scanning");
    try {
      const salt = await fetchSalt("fingerprint");
      if (!salt) return;
      // Trigger platform authenticator. The enrolled patient places
      // their finger on the laptop sensor / phone fingerprint pad.
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userIdBytes = new TextEncoder().encode(patientUserId.trim());
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: challenge.buffer as ArrayBuffer,
          rp: { name: "OduDoc", id: window.location.hostname },
          user: { id: userIdBytes.buffer as ArrayBuffer, name: patientUserId.trim(), displayName: patientUserId.trim() },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 60_000,
          attestation: "none",
        },
      }) as PublicKeyCredential | null;
      if (!cred) throw new Error("WebAuthn returned no credential");

      // Use the credential id (a stable identifier the authenticator
      // produces for this device-user combo) as the underlying
      // template input. HMAC with the per-user salt before storage.
      const idBytes = new Uint8Array(cred.rawId);
      const templateHash = await hmacB64(salt, idBytes);

      setPhase("enrolling");
      const r = await fetch("/api/biometric/enroll", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "fingerprint",
          templateHash, salt,
          consentRecordId: consentRecordId.trim(),
          orgId,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ kind: "err", text: data.error || `Enrollment failed (${r.status})` }); return; }
      setMsg({ kind: "ok", text: `Fingerprint enrolled (${data.enrollment.id}).` });
      setPatientUserId(""); setConsentRecordId("");
    } catch (e) {
      setMsg({ kind: "err", text: `WebAuthn failed: ${(e as Error).message}` });
    } finally {
      setBusy(false); setPhase("idle");
    }
  };

  const enrollFace = async () => {
    if (!orgId || !patientUserId.trim() || !consentRecordId.trim()) {
      setMsg({ kind: "err", text: "Org, patient userId, and consent record id are all required." });
      return;
    }
    if (!streamRef.current || !videoRef.current || !canvasRef.current) {
      setMsg({ kind: "err", text: "Camera not running." });
      return;
    }
    setBusy(true); setMsg(null); setPhase("scanning");
    try {
      const salt = await fetchSalt("face");
      if (!salt) return;
      // Capture one frame.
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas context unavailable");
      canvas.width = videoRef.current!.videoWidth || 480;
      canvas.height = videoRef.current!.videoHeight || 360;
      ctx.drawImage(videoRef.current!, 0, 0, canvas.width, canvas.height);
      // Pixel-hash demo. Production: run a face-embedding model and
      // HMAC the embedding instead — this is brittle to lighting.
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const templateHash = await hmacB64(salt, imageData.data);

      setPhase("enrolling");
      const r = await fetch("/api/biometric/enroll", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "face",
          templateHash, salt,
          consentRecordId: consentRecordId.trim(),
          orgId,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ kind: "err", text: data.error || `Enrollment failed (${r.status})` }); return; }
      setMsg({ kind: "ok", text: `Face enrolled (${data.enrollment.id}). Demo uses pixel-hash; production would use face embeddings.` });
      setPatientUserId(""); setConsentRecordId("");
    } catch (e) {
      setMsg({ kind: "err", text: `Face capture failed: ${(e as Error).message}` });
    } finally {
      setBusy(false); setPhase("idle");
    }
  };

  if (!orgId) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Pick an organization from the header.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Biometric kiosk</h2>
        <p className="mt-1 text-sm text-gray-500">
          Browser-native enrollment using WebAuthn + getUserMedia. No USB SDK or vendor driver required.
          Hospital reception captures one biometric per patient, gated on a signed consent record.
        </p>
        <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-[10px] text-amber-800 ring-1 ring-amber-200">
          Demo limitation: face capture stores a pixel hash that's brittle to lighting/angle. Production deployment swaps in a face-embedding model (FaceNet/ArcFace) before HMAC. Fingerprint via WebAuthn is production-grade.
        </p>
      </div>

      {msg && <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${msg.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{msg.text}</div>}

      {/* Patient + consent */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="mb-3 text-sm font-bold text-slate-900">Patient + consent</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">
            Patient userId
            <input value={patientUserId} onChange={(e) => setPatientUserId(e.target.value)} placeholder="usr-…" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Consent record id
            <input value={consentRecordId} onChange={(e) => setConsentRecordId(e.target.value)} placeholder="con-…" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
          </label>
        </div>
      </section>

      {/* Mode */}
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="mb-3 text-sm font-bold text-slate-900">Method</p>
        <div className="flex gap-2">
          <button onClick={() => setMode("fingerprint")} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${mode === "fingerprint" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}>
            🔒 Fingerprint (WebAuthn)
          </button>
          <button onClick={() => setMode("face")} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${mode === "face" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}>
            👤 Face (camera)
          </button>
        </div>

        {mode === "fingerprint" ? (
          <div className="mt-4">
            <p className="text-xs text-slate-500">
              Click the button below — your laptop or tablet will prompt the patient to place a finger on its built-in sensor (Touch ID, Win Hello, Android fingerprint). The credential id is HMAC-hashed with a per-user salt before it leaves the browser.
            </p>
            <button
              onClick={enrollFingerprint}
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {phase === "scanning" ? "Place finger on sensor…" : phase === "enrolling" ? "Enrolling…" : "Start fingerprint enrollment"}
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-3">
              Patient looks straight at the camera. Click capture once their face is centered and well-lit.
            </p>
            <div className="flex flex-col items-center gap-3">
              <video ref={videoRef} className="rounded-xl bg-slate-900 w-full max-w-sm aspect-[4/3]" playsInline />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2 w-full">
                {!streamRef.current ? (
                  <button onClick={startCamera} disabled={busy} className="flex-1 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">
                    Start camera
                  </button>
                ) : (
                  <>
                    <button onClick={enrollFace} disabled={busy} className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                      {phase === "scanning" ? "Capturing…" : phase === "enrolling" ? "Enrolling…" : "Capture + enroll"}
                    </button>
                    <button onClick={stopCamera} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-300">
                      Stop
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
