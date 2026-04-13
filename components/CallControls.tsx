"use client";

interface CallControlsProps {
  isCameraOn: boolean;
  isMicOn: boolean;
  isScreenSharing: boolean;
  isChatOpen: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onEndCall: () => void;
}

export default function CallControls({
  isCameraOn,
  isMicOn,
  isScreenSharing,
  isChatOpen,
  onToggleCamera,
  onToggleMic,
  onToggleScreenShare,
  onToggleChat,
  onEndCall,
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      {/* Microphone */}
      <button
        onClick={onToggleMic}
        title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
        className={`group relative flex h-12 w-12 items-center justify-center rounded-full transition-all sm:h-14 sm:w-14 ${
          isMicOn
            ? "bg-gray-700 hover:bg-gray-600 text-white"
            : "bg-red-500 hover:bg-red-600 text-white"
        }`}
      >
        {isMicOn ? (
          <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        ) : (
          <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        )}
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          {isMicOn ? "Mute" : "Unmute"}
        </span>
      </button>

      {/* Camera */}
      <button
        onClick={onToggleCamera}
        title={isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
        className={`group relative flex h-12 w-12 items-center justify-center rounded-full transition-all sm:h-14 sm:w-14 ${
          isCameraOn
            ? "bg-gray-700 hover:bg-gray-600 text-white"
            : "bg-red-500 hover:bg-red-600 text-white"
        }`}
      >
        {isCameraOn ? (
          <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        )}
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          {isCameraOn ? "Camera Off" : "Camera On"}
        </span>
      </button>

      {/* Screen Share */}
      <button
        onClick={onToggleScreenShare}
        title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
        className={`group relative flex h-12 w-12 items-center justify-center rounded-full transition-all sm:h-14 sm:w-14 ${
          isScreenSharing
            ? "bg-blue-500 hover:bg-blue-600 text-white"
            : "bg-gray-700 hover:bg-gray-600 text-white"
        }`}
      >
        <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          {isScreenSharing ? "Stop Share" : "Share Screen"}
        </span>
      </button>

      {/* Chat */}
      <button
        onClick={onToggleChat}
        title={isChatOpen ? "Close Chat" : "Open Chat"}
        className={`group relative flex h-12 w-12 items-center justify-center rounded-full transition-all sm:h-14 sm:w-14 ${
          isChatOpen
            ? "bg-primary-500 hover:bg-primary-600 text-white"
            : "bg-gray-700 hover:bg-gray-600 text-white"
        }`}
      >
        <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          {isChatOpen ? "Close Chat" : "Chat"}
        </span>
      </button>

      {/* End Call */}
      <button
        onClick={onEndCall}
        title="End Call"
        className="group relative flex h-12 w-16 items-center justify-center rounded-full bg-red-600 text-white transition-all hover:bg-red-700 sm:h-14 sm:w-20"
      >
        <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
        </svg>
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          End Call
        </span>
      </button>
    </div>
  );
}
