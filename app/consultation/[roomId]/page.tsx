"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import VideoCall from "@/components/VideoCall";
import WaitingRoom from "@/components/WaitingRoom";
import Prescription from "@/components/Prescription";

interface RoomInfo {
  id: string;
  roomName: string;
  roomUrl: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  specialty: string;
  fee: number;
  status: string;
  createdAt: string;
}

type Stage = "loading" | "waiting" | "in-call" | "post-call";

export default function ConsultationRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [stage, setStage] = useState<Stage>("loading");
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [callDuration, setCallDuration] = useState("00:00");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showPrescription, setShowPrescription] = useState(false);
  const [error, setError] = useState("");
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    fetchRoomInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const fetchRoomInfo = async () => {
    try {
      const res = await fetch(`/api/rooms?roomId=${roomId}`);
      if (!res.ok) {
        // Room not found - use fallback demo data
        setRoomInfo({
          id: roomId,
          roomName: `demo-room-${roomId}`,
          roomUrl: `demo://demo-room-${roomId}`,
          doctorId: "demo-doctor",
          doctorName: "Dr. Demo Physician",
          patientName: "Patient",
          specialty: "General Physician",
          fee: 25,
          status: "waiting",
          createdAt: new Date().toISOString(),
        });
        setDemoMode(true);
        setStage("waiting");
        return;
      }
      const data = await res.json();
      setRoomInfo(data);
      setDemoMode(data.roomUrl?.startsWith("demo://") || false);
      setStage("waiting");
    } catch {
      setError("Failed to load consultation room.");
    }
  };

  const handleJoinCall = () => {
    setStage("in-call");
  };

  const handleLeaveCall = () => {
    setStage("post-call");
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-5xl">😔</p>
          <h1 className="mt-4 text-2xl font-bold text-white">Consultation Error</h1>
          <p className="mt-2 text-gray-400">{error}</p>
          <Link href="/consult" className="mt-6 inline-block rounded-lg bg-primary-600 px-6 py-3 text-white hover:bg-primary-700">
            Back to Consult
          </Link>
        </div>
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          <p className="mt-4 text-gray-400">Loading consultation room...</p>
        </div>
      </div>
    );
  }

  if (stage === "waiting" && roomInfo) {
    return (
      <WaitingRoom
        patientName={roomInfo.patientName}
        doctorName={roomInfo.doctorName}
        specialty={roomInfo.specialty}
        onJoin={handleJoinCall}
      />
    );
  }

  if (stage === "in-call" && roomInfo) {
    return (
      <VideoCall
        roomUrl={roomInfo.roomUrl}
        userName={roomInfo.patientName}
        token={null}
        demoMode={demoMode}
        onLeave={handleLeaveCall}
      />
    );
  }

  // Post-call screen
  if (stage === "post-call" && roomInfo) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-3xl px-4">
          {/* Summary card */}
          <div className="mb-8 rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Consultation Complete</h1>
            <p className="mt-2 text-gray-500">
              Your consultation with <span className="font-medium">{roomInfo.doctorName}</span> has ended.
            </p>

            {/* Call details */}
            <div className="mt-6 flex justify-center gap-8">
              <div>
                <p className="text-sm text-gray-400">Duration</p>
                <p className="text-lg font-semibold text-gray-900">{callDuration || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Specialty</p>
                <p className="text-lg font-semibold text-gray-900">{roomInfo.specialty}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Fee</p>
                <p className="text-lg font-semibold text-gray-900">${roomInfo.fee}</p>
              </div>
            </div>

            {/* Rating */}
            <div className="mt-8">
              <p className="mb-3 text-sm font-medium text-gray-700">Rate this consultation</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <svg
                      className={`h-8 w-8 ${
                        star <= (hoverRating || rating) ? "text-yellow-400" : "text-gray-200"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="mt-2 text-sm text-green-600">
                  Thank you for your {rating}-star rating!
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <button
              onClick={() => setShowPrescription(!showPrescription)}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-4 text-sm font-medium text-gray-700 shadow-sm transition-all hover:shadow-md"
            >
              <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {showPrescription ? "Hide Prescription" : "View Prescription"}
            </button>

            <Link
              href="/consult/book"
              className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book Follow-up
            </Link>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-4 text-sm font-medium text-gray-700 shadow-sm transition-all hover:shadow-md"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          {/* Prescription */}
          {showPrescription && (
            <div className="mt-8">
              <Prescription
                doctorName={roomInfo.doctorName}
                doctorSpecialty={roomInfo.specialty}
                patientName={roomInfo.patientName}
                date={new Date(roomInfo.createdAt).toLocaleDateString()}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
