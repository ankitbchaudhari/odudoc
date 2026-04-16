"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

const GREETING =
  "Hi! I'm OduDoc's Health Assistant. I can help you with booking appointments, finding doctors, understanding symptoms, or navigating the platform. How can I help?";

function getBotResponse(input: string): string {
  const msg = input.toLowerCase();

  // Emergency — always check first
  if (/emergency|urgent/.test(msg)) {
    return "If you're experiencing a medical emergency, please call 911 immediately or go to your nearest emergency room. Do not wait — your safety comes first.";
  }

  // Symptoms with specific advice
  if (/fever/.test(msg)) {
    return "For fever, stay hydrated, rest, and monitor your temperature. If it exceeds 103\u00b0F (39.4\u00b0C) or persists for more than 3 days, please see a doctor. You can book a consultation at /doctors to get professional advice.";
  }
  if (/cold/.test(msg)) {
    return "For a common cold, get plenty of rest, drink warm fluids, and consider over-the-counter remedies for congestion. If symptoms worsen or last more than 10 days, please consult a doctor. Visit /doctors to find one near you.";
  }
  if (/cough/.test(msg)) {
    return "For a persistent cough, stay hydrated and try honey in warm water. If your cough lasts more than 2 weeks, produces blood, or is accompanied by shortness of breath, please see a doctor right away. Book at /doctors.";
  }
  if (/headache/.test(msg)) {
    return "For headaches, try resting in a dark room, staying hydrated, and taking OTC pain relief if appropriate. If you experience severe, sudden headaches or they occur frequently, please consult a doctor. Visit /doctors to book.";
  }
  if (/pain/.test(msg)) {
    return "Pain can have many causes. For mild pain, rest and OTC pain relievers may help. For severe, persistent, or worsening pain, I strongly recommend seeing a doctor. You can find specialists at /doctors.";
  }
  if (/symptom/.test(msg)) {
    return "I can offer general guidance, but symptoms should always be evaluated by a medical professional. Please describe what you're experiencing, or visit /doctors to book an appointment for a proper diagnosis.";
  }

  // Features & navigation
  if (/appointment|book|schedule/.test(msg)) {
    return "To book an appointment:\n1. Visit our /doctors page\n2. Search by specialty or doctor name\n3. Pick an available time slot\n4. Confirm your booking\nYou'll receive a confirmation email with all the details!";
  }
  if (/doctor|find|specialist/.test(msg)) {
    return "You can browse our full directory of verified doctors at /doctors. Filter by specialty, location, rating, or availability. Each profile shows qualifications, reviews, and open slots for booking.";
  }
  if (/prescription/.test(msg)) {
    return "After your consultation, your doctor can issue a digital prescription through OduDoc. You'll find it in your dashboard under 'My Prescriptions'. You can download, print, or share it with any pharmacy.";
  }
  if (/video|consult|online/.test(msg)) {
    return "OduDoc offers video consultations so you can see a doctor from home. When booking, just choose the 'Video Consultation' option. You'll get a secure link before your appointment. Make sure you have a stable internet connection and a quiet space.";
  }
  if (/payment|bill|cost|price/.test(msg)) {
    return "We accept major credit/debit cards, UPI, net banking, and popular wallets. Consultation fees are shown on each doctor's profile before you book. You'll receive a detailed receipt via email after payment.";
  }
  if (/lab|test|report/.test(msg)) {
    return "You can book lab tests through OduDoc! Browse available tests, book a home collection or visit a partner lab, and get digital reports delivered to your dashboard. Visit /lab-tests to explore options.";
  }
  if (/insurance/.test(msg)) {
    return "Many of our partner doctors and labs accept major insurance plans. Check the 'Insurance' tag on a doctor's profile for compatibility. If you need help with claims, our support team can guide you through the process.";
  }
  if (/cancel|reschedule/.test(msg)) {
    return "You can cancel or reschedule from your dashboard under 'My Appointments'. Free cancellation is available up to 4 hours before your slot. For reschedules, simply pick a new available time. Refunds for cancellations are processed within 5-7 business days.";
  }

  // Greetings
  if (/^(hi|hello|hey|good morning|good evening|good afternoon)/i.test(msg)) {
    return "Hello! How can I help you today? I can assist with booking appointments, finding doctors, understanding symptoms, and more.";
  }
  if (/thank|thanks/.test(msg)) {
    return "You're welcome! Is there anything else I can help you with?";
  }

  // Default
  return "I'm not sure about that. Would you like me to connect you with our support team? You can also reach us at support@odudoc.com or call our helpline for immediate assistance.";
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasNotification, setHasNotification] = useState(true);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const openChat = () => {
    setIsOpen(true);
    setHasNotification(false);
    if (messages.length === 0) {
      // Show greeting after a short typing indicator
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages([
          {
            id: ++idCounter.current,
            text: GREETING,
            sender: "bot",
            timestamp: new Date(),
          },
        ]);
      }, 800);
    }
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: ++idCounter.current,
      text: trimmed,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const botMsg: Message = {
        id: ++idCounter.current,
        text: getBotResponse(trimmed),
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!mounted) return null;

  return (
    <>
      {/* Chat Panel */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 ${
          isOpen
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-4 scale-95 opacity-0"
        }`}
        style={{ height: "500px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-primary-600 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">OduDoc</span>
            <span className="text-sm font-medium opacity-90">
              Health Assistant
            </span>
          </div>
          <button
            onClick={closeChat}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/20"
            aria-label="Close chat"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex flex-col gap-3 overflow-y-auto px-4 py-4"
          style={{ height: "calc(500px - 120px)" }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.text}
              </div>
              <span className="mt-1 text-[10px] text-gray-400">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start">
              <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-4 py-3">
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 border-t border-gray-200 bg-white px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white transition-colors hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Floating Button */}
      <button
        onClick={isOpen ? closeChat : openChat}
        className={`fixed bottom-6 right-20 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-all duration-300 hover:bg-primary-700 hover:scale-110 ${
          isOpen ? "rotate-0" : "rotate-0"
        }`}
        aria-label={isOpen ? "Close Health Assistant" : "Open Health Assistant"}
      >
        {/* Notification dot */}
        {hasNotification && !isOpen && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500" />
          </span>
        )}

        {isOpen ? (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </button>
    </>
  );
}
