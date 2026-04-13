"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InstantConsultButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleInstantConsult = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: "instant-consult",
          doctorName: "Next Available Doctor",
          patientName: "Patient",
          specialty: "General Physician",
          fee: 25,
        }),
      });
      const data = await res.json();
      if (data.roomId) {
        router.push(`/consultation/${data.roomId}`);
      }
    } catch (err) {
      console.error("Failed to start instant consultation:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleInstantConsult}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl border-2 border-white bg-transparent px-8 py-4 text-sm font-bold text-white shadow-lg transition-all hover:bg-white/10 hover:scale-105 disabled:opacity-70"
    >
      {loading ? (
        <>
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Creating Room...
        </>
      ) : (
        <>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Start Instant Consultation
        </>
      )}
    </button>
  );
}
