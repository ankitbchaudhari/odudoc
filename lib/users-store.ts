import bcrypt from "bcryptjs";
import { bindPersistentArray } from "./persistent-array";

export interface UserWarning {
  id: string;
  message: string;
  sentAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string; // hashed
  // Role hierarchy (OduDoc org):
  //   patient    — public end user
  //   doctor     — clinical staff with consult access
  //   pharmacist — pharmacy operations (dispensing, Rx verification)
  //   vendor     — pharmacy / marketplace seller (multivendor shop)
  //   support    — customer support agent (tickets, refunds intake)
  //   hr         — HR ops (careers, applicants, internal user mgmt)
  //   staff      — generic back-office staff
  //   admin      — platform admin (super-admin UI access)
  role:
    | "patient"
    | "doctor"
    | "admin"
    | "staff"
    | "vendor"
    | "hr"
    | "support"
    | "pharmacist";
  createdAt: string;

  // Email verification + inactivity tracking.
  emailVerified: boolean;
  lastLoginAt: string | null;

  // Admin moderation fields.
  status: "active" | "banned";
  banReason?: string;
  bannedAt?: string;
  warnings: UserWarning[];

  // Admin-issued temporary-password flow. Set when a doctor is invited by
  // an admin (manual add, doctor-application approval, or a "Hired" career
  // transition). The user must change the password within
  // `tempPasswordExpiresAt` or login is blocked until an admin reissues it.
  mustChangePassword?: boolean;
  tempPasswordExpiresAt?: string;
}

const users: User[] = [];
const { hydrate, reload, flush } = bindPersistentArray<User>(
  "users",
  users,
  () => {
    // Seed the bootstrap admin + a demo vendor so the site has at least
    // one admin and one vendor that can log in on a fresh DB. Real
    // demo / test accounts are otherwise kept out of the seed.
    const nowIso = new Date().toISOString();
    return [
      {
        id: "admin-001",
        name: "OduDoc Admin",
        email: "admin@odudoc.com",
        phone: "+1234567892",
        password: bcrypt.hashSync("admin123", 10),
        role: "admin",
        createdAt: nowIso,
        emailVerified: true,
        lastLoginAt: nowIso,
        status: "active",
        warnings: [],
      },
      {
        id: "demo-vendor-001",
        name: "Demo Vendor",
        email: "vendor@odudoc.com",
        phone: "+1234567893",
        password: bcrypt.hashSync("vendor123", 10),
        role: "vendor",
        createdAt: nowIso,
        emailVerified: true,
        lastLoginAt: null,
        status: "active",
        warnings: [],
      },
    ];
  }
);
await hydrate();

// One-time cleanup: remove the historical demo / doctor / staff seed users
// that shipped with the initial deploy. Checks by id so real users who
// happen to have picked these emails aren't affected.
(function removeLegacySeedUsers() {
  const legacyIds = new Set(["demo-user-001", "demo-doctor-001", "staff-001"]);
  let dirty = false;
  for (let i = users.length - 1; i >= 0; i--) {
    if (legacyIds.has(users[i].id)) {
      users.splice(i, 1);
      dirty = true;
    }
  }
  if (dirty) flush();
})();

// Idempotent ensure: on already-deployed DBs the seed() function won't
// re-run, so we create the demo role accounts here if they're missing.
// This keeps credentials stable on every environment without wiping
// pre-existing users. Any admin can rotate the passwords from
// /admin/users → "Reset pw".
//
// NOTE: these passwords are demo-only defaults, meant to be visible in
// source and changed immediately in production via the admin panel.
// They are NOT secrets.
const DEMO_ACCOUNTS: {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: User["role"];
}[] = [
  {
    id: "demo-vendor-001",
    name: "Demo Vendor",
    email: "vendor@odudoc.com",
    phone: "+1234567893",
    password: "vendor123",
    role: "vendor",
  },
  {
    id: "demo-staff-001",
    name: "Demo Staff",
    email: "staff@odudoc.com",
    phone: "+1234567894",
    password: "staff123",
    role: "staff",
  },
  {
    id: "demo-pharmacist-001",
    name: "Demo Pharmacist",
    email: "pharmacist@odudoc.com",
    phone: "+1234567895",
    password: "pharmacist123",
    role: "pharmacist",
  },
  {
    id: "demo-support-001",
    name: "Demo Support",
    email: "support@odudoc.com",
    phone: "+1234567896",
    password: "support123",
    role: "support",
  },
  {
    id: "demo-hr-001",
    name: "Demo HR",
    email: "hr@odudoc.com",
    phone: "+1234567897",
    password: "hr123",
    role: "hr",
  },
];

(function ensureDemoRoleAccounts() {
  const nowIso = new Date().toISOString();
  let dirty = false;
  for (const seed of DEMO_ACCOUNTS) {
    const normalised = seed.email.toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === normalised)) continue;
    users.push({
      id: seed.id,
      name: seed.name,
      email: seed.email,
      phone: seed.phone,
      password: bcrypt.hashSync(seed.password, 10),
      role: seed.role,
      createdAt: nowIso,
      emailVerified: true,
      lastLoginAt: null,
      status: "active",
      warnings: [],
    });
    dirty = true;
  }
  if (dirty) flush();
})();

// One-time migration: fill in moderation fields on any pre-existing user rows
// that were persisted before these fields existed.
(function migrateModerationFields() {
  let dirty = false;
  for (const u of users) {
    if (u.status === undefined) {
      u.status = "active";
      dirty = true;
    }
    if (!Array.isArray(u.warnings)) {
      u.warnings = [];
      dirty = true;
    }
  }
  if (dirty) flush();
})();

export async function reloadUsers(): Promise<void> {
  await reload();
}

export function findUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

export type PublicUser = Pick<
  User,
  "id" | "name" | "email" | "role" | "emailVerified"
>;

export function listUsers(role?: User["role"]): PublicUser[] {
  return users
    .filter((u) => !role || u.role === role)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      emailVerified: u.emailVerified,
    }));
}

export interface AdminUserView {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: User["role"];
  createdAt: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  status: "active" | "banned";
  banReason?: string;
  bannedAt?: string;
  warningsCount: number;
  warnings: UserWarning[];
}

export function listUsersAdmin(): AdminUserView[] {
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt,
    emailVerified: u.emailVerified,
    lastLoginAt: u.lastLoginAt,
    status: u.status || "active",
    banReason: u.banReason,
    bannedAt: u.bannedAt,
    warningsCount: (u.warnings || []).length,
    warnings: u.warnings || [],
  }));
}

export function createUser(
  data: Omit<
    User,
    | "id"
    | "createdAt"
    | "password"
    | "emailVerified"
    | "lastLoginAt"
    | "status"
    | "warnings"
    | "banReason"
    | "bannedAt"
  > & {
    password: string;
  }
): User {
  const hashedPassword = bcrypt.hashSync(data.password, 10);
  const newUser: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: data.name,
    email: data.email.toLowerCase(),
    phone: data.phone,
    password: hashedPassword,
    role: data.role,
    createdAt: new Date().toISOString(),
    emailVerified: false,
    lastLoginAt: null,
    status: "active",
    warnings: [],
  };
  users.push(newUser);
  flush();
  return newUser;
}

export function validatePassword(
  plainPassword: string,
  hashedPassword: string
): boolean {
  return bcrypt.compareSync(plainPassword, hashedPassword);
}

export function markEmailVerified(email: string): User | null {
  const u = findUserByEmail(email);
  if (!u) return null;
  u.emailVerified = true;
  u.lastLoginAt = new Date().toISOString();
  flush();
  return u;
}

export function touchLastLogin(email: string): void {
  const u = findUserByEmail(email);
  if (u) {
    u.lastLoginAt = new Date().toISOString();
    flush();
  }
}

export function isInactiveFor(email: string, days: number): boolean {
  const u = findUserByEmail(email);
  if (!u) return false;
  if (!u.lastLoginAt) return true;
  const last = new Date(u.lastLoginAt).getTime();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return last < cutoff;
}

// ---------- Admin moderation helpers ----------

export function banUser(id: string, reason: string): User | null {
  const u = findUserById(id);
  if (!u) return null;
  u.status = "banned";
  u.banReason = reason;
  u.bannedAt = new Date().toISOString();
  flush();
  return u;
}

export function unbanUser(id: string): User | null {
  const u = findUserById(id);
  if (!u) return null;
  u.status = "active";
  u.banReason = undefined;
  u.bannedAt = undefined;
  flush();
  return u;
}

export function addWarning(id: string, message: string): User | null {
  const u = findUserById(id);
  if (!u) return null;
  if (!Array.isArray(u.warnings)) u.warnings = [];
  u.warnings.push({
    id: `warn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    message,
    sentAt: new Date().toISOString(),
  });
  flush();
  return u;
}

export function changeUserRole(
  id: string,
  newRole: User["role"]
): User | null {
  const u = findUserById(id);
  if (!u) return null;
  u.role = newRole;
  flush();
  return u;
}

export function deleteUser(id: string): User | null {
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) return null;
  const [removed] = users.splice(idx, 1);
  flush();
  return removed;
}

// Direct-set a new plaintext password. Used by the self-service password
// reset flow where the user already proved identity via an email token.
export function setUserPassword(email: string, plain: string): User | null {
  const u = findUserByEmail(email);
  if (!u) return null;
  u.password = bcrypt.hashSync(plain, 10);
  // Changing the password clears any pending temp-password gate.
  u.mustChangePassword = false;
  u.tempPasswordExpiresAt = undefined;
  flush();
  return u;
}

// Issue a fresh temporary password that the user must rotate within
// `ttlDays`. Used by the doctor-onboarding flow (manual add, application
// approval, "Hired" career transition) so the welcome email can carry a
// one-shot credential.
export function issueTempPassword(
  id: string,
  ttlDays: number = 7,
): { user: User; tempPassword: string; expiresAt: string } | null {
  const u = findUserById(id);
  if (!u) return null;
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let temp = "";
  for (let i = 0; i < 12; i++) {
    temp += charset[Math.floor(Math.random() * charset.length)];
  }
  u.password = bcrypt.hashSync(temp, 10);
  u.mustChangePassword = true;
  const expiresAt = new Date(
    Date.now() + ttlDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  u.tempPasswordExpiresAt = expiresAt;
  // Mark the email as verified — an admin vouched for this address by
  // inviting the doctor, and we don't want to block the first login behind
  // the standard self-service verification link.
  u.emailVerified = true;
  flush();
  return { user: u, tempPassword: temp, expiresAt };
}

export function resetUserPassword(id: string): { user: User; tempPassword: string } | null {
  const u = findUserById(id);
  if (!u) return null;
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let temp = "";
  for (let i = 0; i < 12; i++) {
    temp += charset[Math.floor(Math.random() * charset.length)];
  }
  u.password = bcrypt.hashSync(temp, 10);
  flush();
  return { user: u, tempPassword: temp };
}
