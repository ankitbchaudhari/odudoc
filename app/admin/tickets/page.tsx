"use client";

import { useState } from "react";

interface TicketMessage {
  sender: "customer" | "support";
  name: string;
  text: string;
  time: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  customer: string;
  email: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  date: string;
  messages: TicketMessage[];
}

const initialTickets: Ticket[] = [
  {
    id: "t1", ticketNumber: "TKT-001", subject: "Order not received", customer: "John Smith", email: "john@example.com",
    priority: "High", status: "Open", date: "Apr 13, 2026",
    messages: [
      { sender: "customer", name: "John Smith", text: "I placed an order 5 days ago (ORD-2026-001) and haven't received it yet. Can you check the status?", time: "10:30 AM" },
      { sender: "support", name: "Support Agent", text: "Hi John, I'm looking into this for you. Let me check with our shipping team.", time: "11:15 AM" },
    ],
  },
  {
    id: "t2", ticketNumber: "TKT-002", subject: "Wrong item delivered", customer: "Emily Davis", email: "emily@example.com",
    priority: "High", status: "In Progress", date: "Apr 12, 2026",
    messages: [
      { sender: "customer", name: "Emily Davis", text: "I ordered Vitamin D3 but received Vitamin C instead. Please help me get the correct product.", time: "2:00 PM" },
      { sender: "support", name: "Support Agent", text: "We apologize for the mix-up. We'll send the correct item and arrange a return pickup for the wrong one.", time: "3:30 PM" },
      { sender: "customer", name: "Emily Davis", text: "Thank you! When can I expect the replacement?", time: "4:00 PM" },
    ],
  },
  {
    id: "t3", ticketNumber: "TKT-003", subject: "Refund request", customer: "Robert Wilson", email: "robert@example.com",
    priority: "Medium", status: "Open", date: "Apr 13, 2026",
    messages: [
      { sender: "customer", name: "Robert Wilson", text: "I'd like to request a refund for my recent order. The product didn't meet my expectations.", time: "9:00 AM" },
    ],
  },
  {
    id: "t4", ticketNumber: "TKT-004", subject: "Account login issue", customer: "Maria Garcia", email: "maria@example.com",
    priority: "Low", status: "Resolved", date: "Apr 11, 2026",
    messages: [
      { sender: "customer", name: "Maria Garcia", text: "I can't log into my account. I've tried resetting my password but it's not working.", time: "8:00 AM" },
      { sender: "support", name: "Support Agent", text: "I've reset your account. Please try logging in again with the temporary password sent to your email.", time: "9:00 AM" },
      { sender: "customer", name: "Maria Garcia", text: "It works now! Thank you for the quick help.", time: "9:30 AM" },
    ],
  },
  {
    id: "t5", ticketNumber: "TKT-005", subject: "Prescription upload failing", customer: "David Lee", email: "david@example.com",
    priority: "Medium", status: "Closed", date: "Apr 10, 2026",
    messages: [
      { sender: "customer", name: "David Lee", text: "I'm unable to upload my prescription. The page shows an error.", time: "1:00 PM" },
      { sender: "support", name: "Support Agent", text: "This was a temporary issue that has been resolved. Please try again.", time: "2:00 PM" },
    ],
  },
];

const priorityColors: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-green-100 text-green-700",
};

const statusColors: Record<string, string> = {
  Open: "bg-blue-100 text-blue-700",
  "In Progress": "bg-yellow-100 text-yellow-700",
  Resolved: "bg-green-100 text-green-700",
  Closed: "bg-gray-100 text-gray-500",
};

const statusTabs = ["All", "Open", "In Progress", "Resolved", "Closed"];

export default function AdminTickets() {
  const [tickets, setTickets] = useState(initialTickets);
  const [activeTab, setActiveTab] = useState("All");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");

  const filtered = tickets.filter((t) => activeTab === "All" || t.status === activeTab);

  const handleReply = () => {
    if (!replyText.trim() || !selectedTicket) return;
    const newMessage: TicketMessage = {
      sender: "support",
      name: "Support Agent",
      text: replyText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const updated = tickets.map((t) =>
      t.id === selectedTicket.id
        ? { ...t, messages: [...t.messages, newMessage], status: "In Progress" as const }
        : t
    );
    setTickets(updated);
    setSelectedTicket({ ...selectedTicket, messages: [...selectedTicket.messages, newMessage], status: "In Progress" });
    setReplyText("");
  };

  const handleStatusChange = (ticketId: string, newStatus: Ticket["status"]) => {
    setTickets(tickets.map((t) => t.id === ticketId ? { ...t, status: newStatus } : t));
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, status: newStatus });
    }
  };

  const handlePriorityChange = (ticketId: string, newPriority: Ticket["priority"]) => {
    setTickets(tickets.map((t) => t.id === ticketId ? { ...t, priority: newPriority } : t));
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, priority: newPriority });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
        <p className="mt-1 text-sm text-gray-500">{tickets.length} total tickets</p>
      </div>

      {/* Status Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1.5 shadow-sm">
        {statusTabs.map((tab) => {
          const count = tab === "All" ? tickets.length : tickets.filter((t) => t.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab}
              <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === tab ? "bg-white/20" : "bg-gray-100"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-medium">Ticket #</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr key={ticket.id} className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50" onClick={() => setSelectedTicket(ticket)}>
                  <td className="px-4 py-3 font-medium text-primary-600">{ticket.ticketNumber}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{ticket.subject}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-900">{ticket.customer}</p>
                    <p className="text-xs text-gray-400">{ticket.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityColors[ticket.priority]}`}>{ticket.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[ticket.status]}`}>{ticket.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{ticket.date}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setSelectedTicket(ticket)} className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No tickets found.</div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-6 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedTicket.ticketNumber}: {selectedTicket.subject}</h3>
                <p className="text-sm text-gray-500">{selectedTicket.customer} - {selectedTicket.date}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="rounded-lg p-2 hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Controls */}
            <div className="flex gap-3 border-b border-gray-100 px-6 py-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
                <select value={selectedTicket.status} onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as Ticket["status"])} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-primary-500">
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Priority</label>
                <select value={selectedTicket.priority} onChange={(e) => handlePriorityChange(selectedTicket.id, e.target.value as Ticket["priority"])} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-primary-500">
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {selectedTicket.messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === "support" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 ${msg.sender === "support" ? "bg-primary-50 text-primary-900" : "bg-gray-100 text-gray-900"}`}>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-semibold">{msg.name}</span>
                      <span className="text-xs text-gray-400">{msg.time}</span>
                    </div>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply */}
            <div className="border-t border-gray-100 p-4">
              <div className="flex gap-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  rows={2}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                  className="self-end rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
