"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export default function ChatPanel({ isOpen, onClose, userName }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "System",
      text: "Chat started. Messages are only visible during this call.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const msg: Message = {
      id: Date.now().toString(),
      sender: userName,
      text: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={`fixed right-0 top-0 z-50 flex h-full w-80 transform flex-col bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 sm:w-96 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold text-gray-900 dark:text-slate-100">In-Call Chat</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:text-slate-300"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.sender === "System" ? (
                <div className="text-center">
                  <span className="rounded-full bg-gray-100 dark:bg-slate-800 px-3 py-1 text-xs text-gray-500 dark:text-slate-400">
                    {msg.text}
                  </span>
                </div>
              ) : (
                <div
                  className={`flex flex-col ${
                    msg.sender === userName ? "items-end" : "items-start"
                  }`}
                >
                  <span className="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">{msg.sender}</span>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      msg.sender === userName
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="mt-1 text-xs text-gray-400 dark:text-slate-500">{formatTime(msg.timestamp)}</span>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-gray-200 dark:border-slate-800 px-4 py-2 text-sm outline-none focus:border-primary-500"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
