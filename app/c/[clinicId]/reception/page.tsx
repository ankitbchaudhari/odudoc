"use client";

// Clinic reception dashboard. URL: /c/CL-1001/reception
// Staff signs in (clinic-session cookie), then either types a booking ID
// or scans the patient's QR (which encodes /b/BK-XXXX → already opened on
// staff's device since they scanned it). Lookup pulls the booking +
// existing EMR entry, lets staff mark arrival, take payment notes, and
// save vitals/diagnosis/prescription into the clinic EMR.

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QrScanner, { extractBookingId } from "@/components/QrScanner";

interface Booking {
  id: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  date?: string;
  timeSlot: string;
  fee: number;
  paymentStatus: string;
  paymentMode?: "online" | "clinic";
  clinicId?: string;
  clinicName?: string;
  arrivedAt?: string;
  appointmentType?: string;
}

interface EmrEntry {
  id: string;
  bookingId: string;
  chiefComplaint?: string;
  vitals?: Record<string, number>;
  diagnosis?: string;
  prescriptionText?: string;
  notes?: string;
  updatedAt: string;
}

interface SessionInfo {
  staffName: string;
  role: string;
  clinicName: string;
}

export default function ReceptionPage() {
  const params = useParams<{ clinicId: string }>();
  const router = useRouter();
  const clinicId = params.clinicId;

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [bookingIdInput, setBookingIdInput] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [emr, setEmr] = useState<EmrEntry | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Session check on mount — if no clinic-session cookie, redirect to login.
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/clinic/auth", { cache: "no-store" });
      const d = await r.json();
      if (!d.session) {
        router.replace(`/c/${clinicId}/login`);
        return;
      }
      if (d.session.clinicId !== clinicId) {
        router.replace(`/c/${d.session.clinicId}/reception`);
        return;
      }
      setSession({ staffName: d.session.staffName, role: d.session.role, clinicName: d.session.clinicName });
    })();
  }, [clinicId, router]);

  // Allow ?id=BK-1234 to auto-lookup (the QR encodes /b/BK-XXXX which redirects
  // to /booking; reception staff can paste the booking ID instead).
  useEffect(() => {
    const u = new URL(window.location.href);
    const id = u.searchParams.get("id");
    if (id) {
      setBookingIdInput(id);
      lookup(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lookup = useCallback(async (idArg?: string) => {
    const id = (idArg || bookingIdInput).trim();
    if (!id) return;
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/clinic/lookup/${encodeURIComponent(id)}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) {
        setBooking(null); setEmr(null);
        setErr(d.error || "Booking not found");
        return;
      }
      setBooking(d.booking);
      setEmr(d.emr);
    } finally {
      setBusy(false);
    }
  }, [bookingIdInput]);

  const markArrived = async () => {
    if (!booking) return;
    const r = await fetch(`/api/clinic/lookup/${encodeURIComponent(booking.id)}`, { method: "POST" });
    if (r.ok) {
      const d = await r.json();
      setBooking(d.booking);
    }
  };

  const logout = async () => {
    await fetch("/api/clinic/auth", { method: "DELETE" });
    router.replace(`/c/${clinicId}/login`);
  };

  if (!session) {
    return (
      <main className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">Loading…</main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{session.clinicName} · Reception</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400">Signed in as {session.staffName} ({session.role})</p>
        </div>
        <button onClick={logout} className="rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-1.5 text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">
          Sign out
        </button>
      </header>

      <section className="mt-6 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Look up appointment</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          Scan the patient&apos;s QR code with your phone camera (it opens the booking page), or type the booking ID below.
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); lookup(); }}
          className="mt-3 flex flex-wrap gap-2"
        >
          <input
            value={bookingIdInput}
            onChange={(e) => setBookingIdInput(e.target.value.toUpperCase())}
            placeholder="BK-1234"
            className="flex-1 rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 font-mono text-sm uppercase outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
            title="Scan QR code with the camera"
          >
            📷 Scan QR
          </button>
          <button disabled={busy} className="btn-primary disabled:opacity-60">{busy ? "Looking up…" : "Look up"}</button>
        </form>
        {err && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{err}</p>}
      </section>

      <QrScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(decoded) => {
          setScannerOpen(false);
          // QR encodes a URL like https://odudoc.com/b/BK-1234. Pull out
          // the BK-XXXX no matter which form the QR holds.
          const id = extractBookingId(decoded);
          if (id) {
            setBookingIdInput(id);
            lookup(id);
          } else {
            setErr(`Scanned code didn't contain a booking ID: ${decoded.slice(0, 80)}`);
          }
        }}
      />

      {booking && (
        <section className="mt-6 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{booking.patientName}</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">{booking.id}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {booking.arrivedAt ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Arrived {new Date(booking.arrivedAt).toLocaleTimeString()}</span>
              ) : (
                <button onClick={markArrived} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                  Mark arrived
                </button>
              )}
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Row label="Doctor" value={booking.doctorName} />
            <Row label="Slot" value={`${booking.date || "—"} ${booking.timeSlot}`} />
            <Row label="Phone" value={booking.patientPhone} />
            <Row label="Email" value={booking.patientEmail || "—"} />
            <Row label="Fee" value={`$${booking.fee.toFixed(2)}`} />
            <Row
              label="Payment"
              value={
                booking.paymentMode === "clinic"
                  ? booking.paymentStatus === "paid"
                    ? "Paid at clinic ✓"
                    : "Pay at clinic (pending)"
                  : booking.paymentStatus === "paid"
                  ? "Paid online ✓"
                  : booking.paymentStatus
              }
            />
          </dl>

          <EmrEditor bookingId={booking.id} initial={emr} onSaved={setEmr} />
        </section>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-gray-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function EmrEditor({ bookingId, initial, onSaved }: { bookingId: string; initial: EmrEntry | null; onSaved: (e: EmrEntry) => void }) {
  const [chiefComplaint, setCC] = useState(initial?.chiefComplaint || "");
  const [bpSys, setBPS] = useState(initial?.vitals?.bpSystolic?.toString() || "");
  const [bpDia, setBPD] = useState(initial?.vitals?.bpDiastolic?.toString() || "");
  const [pulse, setPulse] = useState(initial?.vitals?.pulseBpm?.toString() || "");
  const [temp, setTemp] = useState(initial?.vitals?.temperatureC?.toString() || "");
  const [spo2, setSpo2] = useState(initial?.vitals?.spo2?.toString() || "");
  const [diagnosis, setDx] = useState(initial?.diagnosis || "");
  const [rx, setRx] = useState(initial?.prescriptionText || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setOk(false);
    setBusy(true);
    try {
      const vitals: Record<string, number> = {};
      if (bpSys) vitals.bpSystolic = Number(bpSys);
      if (bpDia) vitals.bpDiastolic = Number(bpDia);
      if (pulse) vitals.pulseBpm = Number(pulse);
      if (temp) vitals.temperatureC = Number(temp);
      if (spo2) vitals.spo2 = Number(spo2);

      const r = await fetch("/api/clinic/emr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          chiefComplaint: chiefComplaint || undefined,
          vitals: Object.keys(vitals).length ? vitals : undefined,
          diagnosis: diagnosis || undefined,
          prescriptionText: rx || undefined,
          notes: notes || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || "Failed to save");
        return;
      }
      onSaved(d.entry);
      setOk(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-5 border-t border-gray-100 dark:border-slate-800 pt-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Clinic EMR</h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
        Saved against this booking. Patient sees this in their OduDoc dashboard once they sign up with the same phone number.
      </p>

      <label className="mt-3 block">
        <span className="text-xs font-medium text-gray-600 dark:text-slate-400">Chief complaint</span>
        <textarea rows={2} value={chiefComplaint} onChange={(e) => setCC(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm" />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Vital label="BP sys" value={bpSys} setValue={setBPS} />
        <Vital label="BP dia" value={bpDia} setValue={setBPD} />
        <Vital label="Pulse" value={pulse} setValue={setPulse} />
        <Vital label="Temp °C" value={temp} setValue={setTemp} step="0.1" />
        <Vital label="SpO₂ %" value={spo2} setValue={setSpo2} />
      </div>

      <label className="mt-3 block">
        <span className="text-xs font-medium text-gray-600 dark:text-slate-400">Diagnosis</span>
        <textarea rows={2} value={diagnosis} onChange={(e) => setDx(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm" />
      </label>

      <label className="mt-3 block">
        <span className="text-xs font-medium text-gray-600 dark:text-slate-400">Prescription</span>
        <textarea rows={4} value={rx} onChange={(e) => setRx(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 font-mono text-xs" placeholder="e.g. Amoxicillin 500mg, 1 cap TDS x 7d" />
      </label>

      <label className="mt-3 block">
        <span className="text-xs font-medium text-gray-600 dark:text-slate-400">Notes</span>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm" />
      </label>

      {err && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{err}</p>}
      {ok && <p className="mt-3 rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Saved to clinic EMR.</p>}

      <button disabled={busy} className="btn-primary mt-4 w-full disabled:opacity-60">
        {busy ? "Saving…" : "Save to clinic EMR"}
      </button>
    </form>
  );
}

function Vital({ label, value, setValue, step }: { label: string; value: string; setValue: (v: string) => void; step?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</span>
      <input
        type="number"
        step={step || "1"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-0.5 w-full rounded-lg border border-gray-300 dark:border-slate-700 px-2 py-1.5 text-sm"
      />
    </label>
  );
}
