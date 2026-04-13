"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import CallControls from "./CallControls";
import ChatPanel from "./ChatPanel";

interface VideoCallProps {
  roomUrl: string;
  userName: string;
  token?: string | null;
  demoMode: boolean;
  onLeave: () => void;
}

export default function VideoCall({ roomUrl, userName, token, demoMode, onLeave }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<"good" | "fair" | "poor">("good");
  const [remoteParticipant, setRemoteParticipant] = useState<string | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const selfViewRef = useRef<HTMLDivElement>(null);
  const [selfViewPos, setSelfViewPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Start local camera
  useEffect(() => {
    startLocalStream();
    return () => {
      stopAllStreams();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Call timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Simulate connection quality changes in demo mode
  useEffect(() => {
    if (!demoMode) return;
    const interval = setInterval(() => {
      const qualities: Array<"good" | "fair" | "poor"> = ["good", "good", "good", "fair"];
      setConnectionQuality(qualities[Math.floor(Math.random() * qualities.length)]);
    }, 10000);
    return () => clearInterval(interval);
  }, [demoMode]);

  // Demo mode: simulate remote participant after a few seconds
  useEffect(() => {
    if (!demoMode) return;
    const timeout = setTimeout(() => {
      setRemoteParticipant("Demo Participant");
    }, 3000);
    return () => clearTimeout(timeout);
  }, [demoMode]);

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera/mic:", err);
      // Try video only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsMicOn(false);
      } catch {
        console.error("Could not access camera");
      }
    }
  };

  const stopAllStreams = () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const toggleCamera = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsCameraOn((prev) => !prev);
    }
  }, [localStream]);

  const toggleMic = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsMicOn((prev) => !prev);
    }
  }, [localStream]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      // Restore camera to remote view in demo mode
      if (remoteVideoRef.current && localStream) {
        remoteVideoRef.current.srcObject = null;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        screenStreamRef.current = screenStream;
        // Show screen share in the remote/main view area in demo
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
        };
      } catch {
        // User cancelled
      }
    }
  }, [isScreenSharing, localStream]);

  const endCall = useCallback(() => {
    stopAllStreams();
    if (timerRef.current) clearInterval(timerRef.current);
    onLeave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLeave]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const qualityColor = {
    good: "bg-green-400",
    fair: "bg-yellow-400",
    poor: "bg-red-400",
  };

  // Draggable self-view
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selfViewRef.current) return;
    setIsDragging(true);
    const rect = selfViewRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setSelfViewPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const useDragPosition = selfViewPos.x !== 0 || selfViewPos.y !== 0;

  return (
    <div className="relative flex h-screen w-full flex-col bg-gray-900">
      {/* Demo mode banner */}
      {demoMode && (
        <div className="absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-lg bg-yellow-500/90 px-4 py-2 text-center text-sm font-medium text-gray-900 shadow-lg backdrop-blur-sm">
          Demo Mode - Connect your Daily.co API key for full video calling
        </div>
      )}

      {/* Top bar */}
      <div className="absolute left-4 top-4 z-30 flex items-center gap-3">
        {/* Connection quality */}
        <div className="flex items-center gap-2 rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur-sm">
          <div className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-full ${qualityColor[connectionQuality]}`} />
            <span className="text-xs capitalize text-gray-300">{connectionQuality}</span>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2 rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <span className="font-mono text-sm text-white">{formatDuration(callDuration)}</span>
        </div>
      </div>

      {/* Main video area */}
      <div className="relative flex-1">
        {/* Remote / main video */}
        {remoteParticipant || isScreenSharing ? (
          <div className="flex h-full w-full items-center justify-center">
            {isScreenSharing ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gray-800">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-700 text-3xl font-bold text-white">
                  {remoteParticipant?.charAt(0) || "?"}
                </div>
                <p className="mt-4 text-lg text-white">{remoteParticipant}</p>
                {demoMode && (
                  <p className="mt-2 text-sm text-gray-500">
                    Simulated participant (demo mode)
                  </p>
                )}
              </div>
            )}
            {/* Remote participant name overlay */}
            {remoteParticipant && (
              <div className="absolute bottom-20 left-4 rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur-sm">
                <span className="text-sm text-white">{remoteParticipant}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="animate-pulse">
              <svg className="h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="mt-4 text-gray-500">Waiting for other participant to join...</p>
          </div>
        )}

        {/* Self view (picture-in-picture) */}
        <div
          ref={selfViewRef}
          onMouseDown={handleMouseDown}
          className="absolute z-20 cursor-grab overflow-hidden rounded-lg border-2 border-gray-700 shadow-xl active:cursor-grabbing"
          style={
            useDragPosition
              ? { left: selfViewPos.x, top: selfViewPos.y, width: "12rem" }
              : { bottom: "6rem", right: "1rem", width: "12rem" }
          }
        >
          <div className="aspect-video bg-gray-800">
            {isCameraOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-sm font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>
          <div className="absolute bottom-1 left-1 rounded bg-black/60 px-2 py-0.5">
            <span className="text-xs text-white">You</span>
          </div>
          {!isMicOn && (
            <div className="absolute right-1 top-1 rounded-full bg-red-500 p-1">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="relative z-30 flex items-center justify-center bg-gray-900/95 px-4 py-4 backdrop-blur-sm">
        <CallControls
          isCameraOn={isCameraOn}
          isMicOn={isMicOn}
          isScreenSharing={isScreenSharing}
          isChatOpen={isChatOpen}
          onToggleCamera={toggleCamera}
          onToggleMic={toggleMic}
          onToggleScreenShare={toggleScreenShare}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
          onEndCall={endCall}
        />
      </div>

      {/* Chat panel */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userName={userName}
      />
    </div>
  );
}
