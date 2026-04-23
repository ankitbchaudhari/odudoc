// Vendors (multivendor pharmacy store) — Postgres-backed via bindPersistentArray.
//
// A Vendor is an independent pharmacy that lists products on OduDoc Shop.
// - Admin must approve a vendor before their products go public.
// - Each Product carries a `vendorId` so we can attribute sales, compute
//   commission, and show "Sold by X" on the storefront.

import { bindPersistentArray } from "./persistent-array";

export type VendorStatus = "pending" | "approved" | "suspended" | "rejected";

export interface Vendor {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  addressLine: string;
  city: string;
  country: string;
  licenseNumber: string;
  licenseDocUrl?: string;
  bankAccount?: string;
  commissionPercent: number;
  status: VendorStatus;
  statusReason?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  stripeAccountId?: string;
  stripePayoutsEnabled?: boolean;
  stripeDetailsSubmitted?: boolean;
}

const vendors: Vendor[] = [];
const { hydrate, flush } = bindPersistentArray<Vendor>(
  "vendors",
  vendors,
  () => {
    const n = new Date().toISOString();
    return [
      {
        id: "v-house",
        name: "OduDoc Pharmacy",
        ownerName: "OduDoc Team",
        ownerEmail: "pharmacy@odudoc.com",
        phone: "+1-800-ODUDOC",
        addressLine: "OduDoc HQ",
        city: "Online",
        country: "Global",
        licenseNumber: "HOUSE-0001",
        commissionPercent: 0,
        status: "approved",
        createdAt: n,
        updatedAt: n,
        approvedAt: n,
      },
      {
        // Demo vendor — paired with the demo-vendor-001 user in
        // users-store. Credentials: vendor@odudoc.com / vendor123.
        id: "v-demo",
        name: "Demo Pharmacy",
        ownerName: "Demo Vendor",
        ownerEmail: "vendor@odudoc.com",
        phone: "+1234567893",
        addressLine: "123 Demo Street",
        city: "Demo City",
        country: "India",
        licenseNumber: "DEMO-0001",
        commissionPercent: 15,
        status: "approved",
        createdAt: n,
        updatedAt: n,
        approvedAt: n,
      },
    ];
  }
);
await hydrate();

// Idempotent ensure: on already-deployed DBs the seed() function won't
// re-run. Make sure the demo vendor record exists so the demo-vendor
// user can see their dashboard on every environment.
(function ensureDemoVendor() {
  const email = "vendor@odudoc.com";
  if (vendors.some((v) => v.ownerEmail.toLowerCase() === email)) return;
  const n = new Date().toISOString();
  vendors.push({
    id: "v-demo",
    name: "Demo Pharmacy",
    ownerName: "Demo Vendor",
    ownerEmail: email,
    phone: "+1234567893",
    addressLine: "123 Demo Street",
    city: "Demo City",
    country: "India",
    licenseNumber: "DEMO-0001",
    commissionPercent: 15,
    status: "approved",
    createdAt: n,
    updatedAt: n,
    approvedAt: n,
  });
  flush();
})();

const now = () => new Date().toISOString();
const genId = () => `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

export interface CreateVendorInput {
  name: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  addressLine: string;
  city: string;
  country: string;
  licenseNumber: string;
  licenseDocUrl?: string;
  bankAccount?: string;
}

export function createVendor(input: CreateVendorInput): Vendor {
  const email = input.ownerEmail.trim().toLowerCase();
  const existing = vendors.find((v) => v.ownerEmail === email);
  if (existing) return existing;
  const v: Vendor = {
    id: genId(),
    name: input.name.trim(),
    ownerName: input.ownerName.trim(),
    ownerEmail: email,
    phone: input.phone.trim(),
    addressLine: input.addressLine.trim(),
    city: input.city.trim(),
    country: input.country.trim(),
    licenseNumber: input.licenseNumber.trim(),
    licenseDocUrl: input.licenseDocUrl,
    bankAccount: input.bankAccount,
    commissionPercent: 10,
    status: "pending",
    createdAt: now(),
    updatedAt: now(),
  };
  vendors.unshift(v);
  flush();
  return v;
}

export function listVendors(opts: { status?: VendorStatus | "All" } = {}): Vendor[] {
  let list = [...vendors];
  if (opts.status && opts.status !== "All") list = list.filter((v) => v.status === opts.status);
  return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getVendorById(id: string): Vendor | null {
  return vendors.find((v) => v.id === id) || null;
}

export function getVendorByEmail(email: string): Vendor | null {
  return vendors.find((v) => v.ownerEmail === email.trim().toLowerCase()) || null;
}

export function updateVendor(id: string, patch: Partial<Vendor>): Vendor | null {
  const v = vendors.find((x) => x.id === id);
  if (!v) return null;
  const updatable: (keyof Vendor)[] = [
    "name", "ownerName", "phone", "addressLine", "city", "country",
    "licenseNumber", "licenseDocUrl", "bankAccount", "commissionPercent",
    "stripeAccountId", "stripePayoutsEnabled", "stripeDetailsSubmitted",
  ];
  updatable.forEach((k) => {
    if (patch[k] !== undefined) (v as unknown as Record<string, unknown>)[k] = patch[k];
  });
  v.updatedAt = now();
  flush();
  return v;
}

export function setVendorStatus(id: string, status: VendorStatus, reason?: string): Vendor | null {
  const v = vendors.find((x) => x.id === id);
  if (!v) return null;
  v.status = status;
  v.statusReason = reason;
  v.updatedAt = now();
  if (status === "approved" && !v.approvedAt) v.approvedAt = v.updatedAt;
  flush();
  return v;
}

export function isApprovedVendor(email?: string | null): Vendor | null {
  if (!email) return null;
  const v = getVendorByEmail(email);
  return v && v.status === "approved" ? v : null;
}
