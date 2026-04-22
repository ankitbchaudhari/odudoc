// Client-side store for the clinic management dashboard.
//
// Everything is persisted in localStorage under `odudoc:clinic:<section>`
// so the demo works without a backend. Each section exports a tiny set
// of CRUD helpers + a React hook for components to subscribe to changes.
//
// When you're ready for real persistence, swap the readers/writers below
// for fetch calls to /api/clinic/<section>/* — the public hook signatures
// won't need to change.

"use client";

import { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClinicAppointment {
  id: string;
  patientName: string;
  doctorName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  reason: string;
  status: "scheduled" | "completed" | "cancelled";
  reminderSent?: boolean;
  createdAt: string;
}

export interface ClinicPatient {
  id: string;
  name: string;
  age: string;
  gender: "male" | "female" | "other";
  phone: string;
  email: string;
  conditions: string; // comma-separated
  allergies: string;
  lastVisit: string;
  notes: string;
  createdAt: string;
}

export interface ClinicInvoice {
  id: string;
  invoiceNumber: string;
  patientName: string;
  items: { description: string; amount: number }[];
  subtotal: number;
  taxRate: number; // e.g. 18 for 18% GST
  tax: number;
  total: number;
  status: "paid" | "unpaid" | "overdue";
  issuedAt: string;
}

export interface ClinicInventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  reorderLevel: number;
  unitPrice: number;
  supplier: string;
  updatedAt: string;
}

export interface ClinicStaff {
  id: string;
  name: string;
  role: string;
  salary: number;
  phone: string;
  email: string;
  joinedAt: string;
}

export interface ClinicBranch {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
  active: boolean;
}

type Section =
  | "appointments"
  | "patients"
  | "invoices"
  | "inventory"
  | "staff"
  | "branches";

// ---------------------------------------------------------------------------
// Low-level IO
// ---------------------------------------------------------------------------

function storageKey(section: Section): string {
  return `odudoc:clinic:${section}`;
}

function read<T>(section: Section): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(section));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(section: Section, data: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(section), JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(`odudoc:clinic:${section}`));
  } catch {
    /* quota / privacy mode */
  }
}

// ---------------------------------------------------------------------------
// Generic hook — every section uses the same subscribe/update pattern
// ---------------------------------------------------------------------------

function useSection<T extends { id: string }>(
  section: Section,
  seed: () => T[]
) {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    const existing = read<T>(section);
    if (existing.length === 0) {
      const seeded = seed();
      write(section, seeded);
      setItems(seeded);
    } else {
      setItems(existing);
    }
    const refresh = () => setItems(read<T>(section));
    const eventName = `odudoc:clinic:${section}`;
    window.addEventListener(eventName, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(eventName, refresh);
      window.removeEventListener("storage", refresh);
    };
    // seed is expected to be stable; we intentionally exclude it to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const add = useCallback(
    (item: Omit<T, "id">) => {
      const full = { ...item, id: `${section}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` } as T;
      const next = [full, ...read<T>(section)];
      write(section, next);
      setItems(next);
      return full;
    },
    [section]
  );

  const update = useCallback(
    (id: string, patch: Partial<T>) => {
      const next = read<T>(section).map((i) => (i.id === id ? { ...i, ...patch } : i));
      write(section, next);
      setItems(next);
    },
    [section]
  );

  const remove = useCallback(
    (id: string) => {
      const next = read<T>(section).filter((i) => i.id !== id);
      write(section, next);
      setItems(next);
    },
    [section]
  );

  return { items, add, update, remove };
}

// ---------------------------------------------------------------------------
// Seed data — makes the empty dashboard feel alive on first visit
// ---------------------------------------------------------------------------

const iso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const seedAppointments = (): ClinicAppointment[] => [
  {
    id: "apt-seed-1",
    patientName: "Priya Sharma",
    doctorName: "Dr. Sarah Johnson",
    date: today(),
    time: "10:30",
    reason: "Follow-up for hypertension",
    status: "scheduled",
    reminderSent: true,
    createdAt: iso(),
  },
  {
    id: "apt-seed-2",
    patientName: "Michael Chen",
    doctorName: "Dr. Dixit Velani",
    date: plusDays(1),
    time: "14:00",
    reason: "Skin consultation",
    status: "scheduled",
    reminderSent: false,
    createdAt: iso(),
  },
];

const seedPatients = (): ClinicPatient[] => [
  {
    id: "pat-seed-1",
    name: "Priya Sharma",
    age: "42",
    gender: "female",
    phone: "+91 98765 43210",
    email: "priya@example.com",
    conditions: "Hypertension, Type 2 Diabetes",
    allergies: "Penicillin",
    lastVisit: today(),
    notes: "On Metformin 500mg twice daily.",
    createdAt: iso(),
  },
];

const seedInvoices = (): ClinicInvoice[] => [
  {
    id: "inv-seed-1",
    invoiceNumber: "INV-2026-0001",
    patientName: "Priya Sharma",
    items: [
      { description: "Consultation", amount: 500 },
      { description: "Blood pressure check", amount: 200 },
    ],
    subtotal: 700,
    taxRate: 18,
    tax: 126,
    total: 826,
    status: "paid",
    issuedAt: iso(),
  },
];

const seedInventory = (): ClinicInventoryItem[] => [
  {
    id: "inv-item-1",
    name: "Paracetamol 500mg",
    category: "Medicine",
    stock: 120,
    reorderLevel: 50,
    unitPrice: 2,
    supplier: "MediSupply Co.",
    updatedAt: iso(),
  },
  {
    id: "inv-item-2",
    name: "Surgical Gloves (Box)",
    category: "Supplies",
    stock: 8,
    reorderLevel: 15,
    unitPrice: 250,
    supplier: "HealthGear Ltd.",
    updatedAt: iso(),
  },
];

const seedStaff = (): ClinicStaff[] => [
  {
    id: "staff-seed-1",
    name: "Dr. Sarah Johnson",
    role: "General Physician",
    salary: 80000,
    phone: "+91 99999 11111",
    email: "sarah@odudoc.com",
    joinedAt: "2023-01-15",
  },
  {
    id: "staff-seed-2",
    name: "Nisha Patel",
    role: "Receptionist",
    salary: 25000,
    phone: "+91 98888 22222",
    email: "nisha@odudoc.com",
    joinedAt: "2024-06-01",
  },
];

const seedBranches = (): ClinicBranch[] => [
  {
    id: "br-seed-1",
    name: "Main Branch — Mumbai",
    address: "Andheri West, Mumbai, MH 400053",
    phone: "+91 22 2600 0000",
    manager: "Rahul Mehta",
    active: true,
  },
];

// ---------------------------------------------------------------------------
// Public hooks
// ---------------------------------------------------------------------------

export const useClinicAppointments = () =>
  useSection<ClinicAppointment>("appointments", seedAppointments);
export const useClinicPatients = () =>
  useSection<ClinicPatient>("patients", seedPatients);
export const useClinicInvoices = () =>
  useSection<ClinicInvoice>("invoices", seedInvoices);
export const useClinicInventory = () =>
  useSection<ClinicInventoryItem>("inventory", seedInventory);
export const useClinicStaff = () =>
  useSection<ClinicStaff>("staff", seedStaff);
export const useClinicBranches = () =>
  useSection<ClinicBranch>("branches", seedBranches);
