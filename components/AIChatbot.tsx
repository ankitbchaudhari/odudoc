"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Action {
  label: string;
  href: string;
}

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  actions?: Action[];
  quickReplies?: string[];
}

const GREETING =
  "Hi! I'm OduDoc's Health Assistant. I can help you book a video consultation, find a doctor, understand symptoms, or navigate your dashboard. What can I help you with?";

const INITIAL_QUICK_REPLIES = [
  "Book a video consultation",
  "Find a doctor",
  "My prescriptions",
  "Refund policy",
  "I have a cough",
];

interface BotReply {
  text: string;
  actions?: Action[];
  quickReplies?: string[];
}

function getBotReply(input: string): BotReply {
  const msg = input.toLowerCase();

  if (/emergency|urgent|chest pain|can't breathe|unconscious|bleeding heavily/.test(msg)) {
    return {
      text:
        "🚨 If this is a medical emergency, please call your local emergency number (911 / 112) or go to the nearest ER immediately. I can help you with non-urgent care only.",
    };
  }

  if (/book|appointment|schedule|consult/.test(msg) && !/cancel|resched/.test(msg)) {
    return {
      text:
        "Great — I can help you book a video consultation. You'll:\n• Choose a specialty and doctor\n• Share a short medical history\n• Pay securely (fully refundable if the doctor can't take your slot)\n\nReady?",
      actions: [
        { label: "Book now", href: "/consult/book" },
        { label: "Browse doctors", href: "/doctors" },
      ],
      quickReplies: ["What specialists are available?", "How much does it cost?"],
    };
  }

  if (/specialis|specialt|which doctor|types of doctor/.test(msg)) {
    return {
      text:
        "We have General Physicians ($25), Dermatologists ($35), Gynecologists ($40), Pediatricians ($30), Psychiatrists ($45), Cardiologists ($50), Orthopedists ($40), and ENT Specialists ($35).",
      actions: [{ label: "See all doctors", href: "/doctors" }],
    };
  }

  if (/price|fee|cost|how much|charge/.test(msg)) {
    return {
      text:
        "Consultation fees start at $25 for a General Physician and go up to $50–$75 for senior specialists. The exact fee is shown before you pay, and your payment is fully refundable if the doctor cannot take your slot.",
      actions: [{ label: "See pricing per doctor", href: "/doctors" }],
    };
  }

  if (/refund|money back|cancel/.test(msg)) {
    return {
      text:
        "Your consultation payment is fully refundable:\n• If the doctor rejects or can't take your slot → full automatic refund (3–5 business days)\n• If you cancel > 4 hours before the slot → full refund\n• Refunded via your original payment method",
      quickReplies: ["How do I cancel?", "Check my consultations"],
    };
  }

  if (/how do i cancel|cancel my/.test(msg)) {
    return {
      text: "Open your consultation from the dashboard and click cancel. You'll see the refund status there.",
      actions: [{ label: "My consultations", href: "/dashboard/consultations" }],
    };
  }

  if (/prescription|medicine|medication|rx/.test(msg)) {
    return {
      text:
        "After your consultation, your doctor issues a digital prescription. You can:\n• Download it as PDF\n• Show it at any pharmacy offline\n• Buy the exact medicines through our online shop",
      actions: [
        { label: "My prescriptions", href: "/dashboard/prescriptions" },
        { label: "Shop medicines", href: "/shop" },
      ],
    };
  }

  if (/upload|document|report|share file|lab report/.test(msg)) {
    return {
      text:
        "You can upload lab reports, previous prescriptions, or photos (PDFs/images up to 10MB) to share with your doctor before or during the consultation. Open your consultation from the dashboard and use the Upload button.",
      actions: [{ label: "My consultations", href: "/dashboard/consultations" }],
    };
  }

  if (/medical history|questionnaire|form before/.test(msg)) {
    return {
      text:
        "Before your video call, we ask a short medical history questionnaire (chief complaint, symptoms, duration, allergies, medications). This gives your doctor context so the 15-minute slot is most useful to you.",
    };
  }

  if (/video|room|join call|link/.test(msg)) {
    return {
      text:
        "Once your doctor approves the booking, a secure video room link appears on your consultation page. Tip: test your camera/mic beforehand and find a quiet, well-lit spot.",
      actions: [{ label: "My consultations", href: "/dashboard/consultations" }],
    };
  }

  if (/find|doctor|specialist/.test(msg)) {
    return {
      text: "Browse our verified doctors with ratings, experience, and availability.",
      actions: [{ label: "Browse doctors", href: "/doctors" }],
    };
  }

  if (/fever/.test(msg)) {
    return {
      text:
        "For fever: hydrate, rest, and monitor temperature. If it exceeds 103°F (39.4°C), lasts more than 3 days, or comes with severe symptoms, see a doctor soon.",
      actions: [{ label: "Book a GP", href: "/consult/book" }],
    };
  }
  if (/cold|flu/.test(msg)) {
    return {
      text: "For a cold: rest, warm fluids, OTC remedies. If symptoms worsen past 10 days or you develop a high fever, consult a doctor.",
      actions: [{ label: "Book a GP", href: "/consult/book" }],
    };
  }
  if (/cough/.test(msg)) {
    return {
      text: "For a persistent cough: hydrate, honey in warm water. See a doctor if it lasts >2 weeks, produces blood, or comes with breathlessness.",
      actions: [{ label: "Book a GP", href: "/consult/book" }],
    };
  }
  if (/headache|migraine/.test(msg)) {
    return {
      text: "For headaches: rest in a dark room, hydrate, OTC pain relief. See a doctor for sudden/severe or frequent headaches.",
      actions: [{ label: "Book a GP", href: "/consult/book" }],
    };
  }
  if (/skin|rash|acne|eczema/.test(msg)) {
    return {
      text: "Skin concerns are best evaluated by a dermatologist. You can share photos during the consultation.",
      actions: [{ label: "Book a Dermatologist", href: "/consult/book" }],
    };
  }
  if (/anxiety|depression|stress|mental|sleep/.test(msg)) {
    return {
      text: "Our psychiatrists offer confidential video consultations for anxiety, depression, sleep issues, and more. You don't have to go through it alone.",
      actions: [{ label: "Book a Psychiatrist", href: "/consult/book" }],
    };
  }
  if (/heart|chest|bp|blood pressure/.test(msg)) {
    return {
      text: "For heart or blood-pressure concerns, talk to a cardiologist. If you have active chest pain, shortness of breath, or fainting — call emergency services first.",
      actions: [{ label: "Book a Cardiologist", href: "/consult/book" }],
    };
  }
  if (/child|baby|pediatric/.test(msg)) {
    return {
      text: "Our pediatricians handle everything from fevers and rashes to vaccinations and growth questions.",
      actions: [{ label: "Book a Pediatrician", href: "/consult/book" }],
    };
  }

  if (/my consult|my booking|my dashboard|dashboard/.test(msg)) {
    return {
      text: "Here's your dashboard:",
      actions: [
        { label: "My consultations", href: "/dashboard/consultations" },
        { label: "My prescriptions", href: "/dashboard/prescriptions" },
      ],
    };
  }

  if (/insurance|claim/.test(msg)) {
    return {
      text: "Many partner doctors and labs accept major insurance plans. Check the 'Insurance' tag on a doctor's profile. For claims help, email support@odudoc.com.",
    };
  }

  if (/lab|test|blood test/.test(msg)) {
    return {
      text: "You can book lab tests with home collection or at a partner lab, and get digital reports in your dashboard.",
      actions: [{ label: "Browse lab tests", href: "/lab-tests" }],
    };
  }

  if (/^(hi|hello|hey|good morning|good evening|good afternoon)/.test(msg)) {
    return {
      text: "Hi there! What can I help you with today?",
      quickReplies: INITIAL_QUICK_REPLIES,
    };
  }

  if (/thank/.test(msg)) {
    return { text: "You're very welcome! Anything else I can help with?" };
  }

  return {
    text:
      "I'm not sure I got that. You can ask about booking a consultation, finding a doctor, your prescription, refunds, or specific symptoms. Or contact support@odudoc.com.",
    quickReplies: ["Book a consultation", "Find a doctor", "Refund policy"],
  };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const MENU_SHORTCUTS: Action[] = [
  { label: "📅 Book consultation", href: "/consult/book" },
  { label: "🩺 Browse doctors", href: "/doctors" },
  { label: "💊 Shop medicines", href: "/shop" },
  { label: "🧪 Lab tests", href: "/lab-tests" },
  { label: "📋 My dashboard", href: "/dashboard" },
  { label: "📚 Health wiki", href: "/wiki" },
  { label: "💬 Contact support", href: "/contact" },
];

// Routes where the patient-facing chatbot must never render. The
// floating widget covers action buttons (Approve/Reject on admin
// pages, Save Visit in the EMR, Send in the doctor notes panel) and
// is irrelevant to logged-in clinicians anyway. Path prefixes — any
// page underneath these is suppressed.
const SUPPRESS_PREFIXES = [
  "/admin",
  "/dashboard",
  "/consult/room",       // active video calls
  "/auth",               // sign-in / register
  "/for-doctors/register",
];

export default function AIChatbot() {
  const pathname = usePathname() || "";
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasNotification, setHasNotification] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);

  useEffect(() => { setMounted(true); }, []);

  // Hide on suppressed routes BEFORE any render so the bubble never
  // flashes onto the screen during navigation.
  const suppressed = SUPPRESS_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (suppressed) return null;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

  const openChat = () => {
    setIsOpen(true);
    setHasNotification(false);
    if (messages.length === 0) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages([{
          id: ++idCounter.current,
          text: GREETING,
          sender: "bot",
          timestamp: new Date(),
          quickReplies: INITIAL_QUICK_REPLIES,
        }]);
      }, 600);
    }
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const closeChat = () => setIsOpen(false);

  const sendText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: ++idCounter.current,
      text: trimmed,
      sender: "user",
      timestamp: new Date(),
    };
    // Strip quickReplies from the last message so chips don't hang around
    setMessages((prev) => [...prev.map((m) => ({ ...m, quickReplies: undefined })), userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const reply = getBotReply(trimmed);
      setMessages((prev) => [...prev, {
        id: ++idCounter.current,
        text: reply.text,
        sender: "bot",
        timestamp: new Date(),
        actions: reply.actions,
        quickReplies: reply.quickReplies,
      }]);
    }, 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText(input);
    }
  };

  const goToMainMenu = () => {
    setShowMenu(false);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev.map((m) => ({ ...m, quickReplies: undefined })),
        {
          id: ++idCounter.current,
          text: "Sure — here's the main menu. What would you like to do?",
          sender: "bot",
          timestamp: new Date(),
          quickReplies: INITIAL_QUICK_REPLIES,
        },
      ]);
    }, 400);
  };

  const goBack = () => {
    // Remove the last bot+user exchange (up to last 2 messages)
    setMessages((prev) => {
      if (prev.length <= 1) return prev;
      let count = 0;
      const next = [...prev];
      while (next.length > 0 && count < 2) {
        next.pop();
        count++;
      }
      // Re-enable quick replies on the new last message if it's a bot message
      if (next.length > 0 && next[next.length - 1].sender === "bot" && !next[next.length - 1].quickReplies) {
        next[next.length - 1] = { ...next[next.length - 1], quickReplies: INITIAL_QUICK_REPLIES };
      }
      return next;
    });
  };

  const clearChat = () => {
    setMessages([
      {
        id: ++idCounter.current,
        text: GREETING,
        sender: "bot",
        timestamp: new Date(),
        quickReplies: INITIAL_QUICK_REPLIES,
      },
    ]);
    setShowMenu(false);
  };

  if (!mounted) return null;

  return (
    <>
      <div
        className={`fixed bottom-24 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl transition-all duration-300 ${
          isOpen ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-4 scale-95 opacity-0"
        }`}
        style={{ height: "560px" }}
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm">🩺</div>
            <div>
              <p className="text-sm font-bold leading-tight">OduDoc Assistant</p>
              <p className="text-[10px] opacity-80">Online · Replies instantly</p>
            </div>
          </div>
          <button onClick={closeChat}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/20"
            aria-label="Close chat">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto px-4 py-4" style={{ height: "calc(560px - 160px)" }}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.sender === "user" ? "bg-primary-600 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200"
              }`}>
                {msg.text}
              </div>

              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {msg.actions.map((a, i) => (
                    <Link key={i} href={a.href}
                      className="rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white hover:bg-primary-700">
                      {a.label} →
                    </Link>
                  ))}
                </div>
              )}

              {msg.quickReplies && msg.quickReplies.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {msg.quickReplies.map((q, i) => (
                    <button key={i} onClick={() => sendText(q)}
                      className="rounded-full border border-primary-200 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50">
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <span className="mt-1 text-[10px] text-gray-400 dark:text-slate-500">{formatTime(msg.timestamp)}</span>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start">
              <div className="flex items-center gap-1 rounded-2xl bg-gray-100 dark:bg-slate-800 px-4 py-3">
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Expandable menu panel */}
        {showMenu && (
          <div className="absolute bottom-[108px] left-0 right-0 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Quick navigation</p>
            <div className="grid grid-cols-2 gap-1.5">
              {MENU_SHORTCUTS.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  onClick={() => { setShowMenu(false); closeChat(); }}
                  className="rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-300 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Action toolbar */}
        <div className="absolute bottom-[56px] left-0 right-0 flex items-center gap-1 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 px-2 py-1.5">
          <button
            onClick={() => setShowMenu((s) => !s)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              showMenu ? "bg-primary-600 text-white" : "text-gray-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
            }`}
            aria-label="Main menu"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Menu
          </button>
          <button
            onClick={goToMainMenu}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
            aria-label="Go to main menu"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </button>
          <button
            onClick={goBack}
            disabled={messages.length <= 1}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Go back"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <button
            onClick={clearChat}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
            aria-label="Clear chat"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Clear
          </button>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/contact"
              onClick={closeChat}
              className="flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-[11px] font-semibold text-primary-700 hover:bg-primary-100"
              title="Talk to a human"
            >
              👤 Human
            </Link>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
          <input ref={inputRef} type="text" value={input}
            onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask anything about your health…"
            className="flex-1 rounded-full border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-4 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
          <button onClick={() => sendText(input)} disabled={!input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <button onClick={isOpen ? closeChat : openChat}
        className="fixed bottom-6 right-20 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-primary-700"
        aria-label={isOpen ? "Close Health Assistant" : "Open Health Assistant"}>
        {hasNotification && !isOpen && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500" />
          </span>
        )}
        {isOpen ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>
    </>
  );
}
