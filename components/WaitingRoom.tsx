"use client";

import { useState, useEffect, useRef } from "react";

interface WaitingRoomProps {
  patientName: string;
  doctorName: string;
  specialty: string;
  onJoin: () => void;
}

export default function WaitingRoom({ patientName, doctorName, specialty, onJoin }: WaitingRoomProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [permissionError, setPermissionError] = useState("");
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    startPreview();
    loadDevices();
    return () => {
      stopPreview();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter((d) => d.kind === "videoinput"));
      setMicrophones(devices.filter((d) => d.kind === "audioinput"));
      setSpeakers(devices.filter((d) => d.kind === "audiooutput"));
    } catch {
      // Devices may not be available
    }
  };

  const startPreview = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      setPermissionError("");

      // Mic level monitoring
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(s);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(Math.min(100, (avg / 128) * 100));
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      loadDevices();
    } catch (err) {
      console.error("Camera/mic error:", err);
      setPermissionError("Please allow camera and microphone access to join the consultation.");
    }
  };

  const stopPreview = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setCameraOn(!cameraOn);
    }
  };

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setMicOn(!micOn);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-600">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Ready to Join?</h1>
          <p className="mt-2 text-gray-400 dark:text-slate-500">
            Consultation with <span className="font-medium text-white">{doctorName}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400">{specialty}</p>
        </div>

        {/* Video Preview */}
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-gray-800">
          <div className="aspect-video">
            {permissionError ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <svg className="mb-4 h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-yellow-300">{permissionError}</p>
                <button
                  onClick={startPreview}
                  className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
                >
                  Try Again
                </button>
              </div>
            ) : !cameraOn ? (
              <div className="flex h-full flex-col items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-700 text-2xl font-bold text-white">
                  {patientName.charAt(0).toUpperCase()}
                </div>
                <p className="mt-3 text-sm text-gray-400 dark:text-slate-500">Camera is off</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            )}
          </div>

          {/* Mic level indicator */}
          {micOn && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <div className="flex h-6 items-end gap-0.5">
                {[20, 40, 60, 80, 100].map((threshold) => (
                  <div
                    key={threshold}
                    className={`w-1 rounded-full transition-all duration-100 ${
                      micLevel >= threshold ? "bg-green-400" : "bg-gray-600"
                    }`}
                    style={{ height: `${threshold * 0.24}rem` }}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400 dark:text-slate-500">Mic</span>
            </div>
          )}

          {/* Name tag */}
          <div className="absolute bottom-4 right-4 rounded-lg bg-black/50 px-3 py-1.5">
            <span className="text-sm text-white">{patientName}</span>
          </div>
        </div>

        {/* Camera/Mic toggles */}
        <div className="mb-6 flex justify-center gap-4">
          <button
            onClick={toggleCamera}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              cameraOn ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-red-500 text-white hover:bg-red-600"
            }`}
          >
            {cameraOn ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            )}
          </button>
          <button
            onClick={toggleMic}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              micOn ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-red-500 text-white hover:bg-red-600"
            }`}
          >
            {micOn ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>
        </div>

        {/* Device Selection */}
        <div className="mb-8 space-y-3 rounded-xl bg-gray-800 p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-300">Device Settings</h3>
          {cameras.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-slate-400">Camera</label>
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
              >
                {cameras.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${cameras.indexOf(d) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          {microphones.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-slate-400">Microphone</label>
              <select
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
              >
                {microphones.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${microphones.indexOf(d) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          {speakers.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-slate-400">Speaker</label>
              <select
                value={selectedSpeaker}
                onChange={(e) => setSelectedSpeaker(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
              >
                {speakers.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Speaker ${speakers.indexOf(d) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Waiting indicator */}
        <div className="mb-6 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            <span className="text-sm text-gray-400 dark:text-slate-500">Your doctor will join shortly</span>
          </div>
        </div>

        {/* Join button */}
        <button
          onClick={onJoin}
          className="w-full rounded-xl bg-primary-600 py-4 text-lg font-semibold text-white transition-all hover:bg-primary-700 hover:shadow-lg"
        >
          Join Consultation
        </button>
      </div>
    </div>
  );
}
