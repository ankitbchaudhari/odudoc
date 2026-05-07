import bcrypt from "bcryptjs";
import { bindPersistentArray } from "./persistent-array";
import { generateUniqueMedicalId } from "./medical-id";

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

  // ------------------------------------------------------------------
  // OduDoc identity (Phase A)
  //
  // Every user gets a 16-digit Medical ID on creation. Patients (and
  // doctors who choose to) can additionally upload a government-issued
  // photo ID which an admin reviews; once approved the account gets a
  // "verified" badge. This is a *soft* gate — unverified users can
  // still browse, book, and pay, but the consult-start flow nudges
  // them to verify, and certain B2B surfaces (corporate plans, clinic
  // onboarding) may hard-gate later.
  medicalId?: string;
  identity?: UserIdentity;

  /** ISO 3166-1 alpha-2 country code (e.g. "IN", "US"). Captured at
   *  signup from the registration form's country dropdown. Drives
   *  cross-border eligibility — Indian-licensed doctors can only
   *  consult patients with country=IN per the IMC telemedicine
   *  guidelines. Optional because pre-feature accounts don't have
   *  it; phone-based heuristic in lib/consultation-eligibility.ts
   *  fills the gap. */
  country?: string;

  /** ABHA (Ayushman Bharat Health Account) number. 14-digit national
   *  health ID issued by NHA. Set when an Indian patient links their
   *  ABHA via /api/abdm/abha/connect. Drives the ABDM integration
   *  surface — care-context linking, PHR push, etc. India-only. */
  abhaId?: string;
  /** Human-readable ABHA address (e.g. "ankit.chaudhari@abdm"). */
  abhaAddress?: string;
  /** Timestamp the ABHA link was last verified against the NHA
   *  authenticator. Drives the "verified ABHA" badge on the patient
   *  profile. */
  abhaLinkedAt?: string;

  // ------------------------------------------------------------------
  // Referral program
  //
  // Every user gets a unique 8-char alphanumeric code on first read
  // (lazy-migrated for old rows). Sharing a link
  // odudoc.com/?ref=ABCD1234 sends signups through the referral
  // attribution flow — see lib/referrals-store.ts. Credit is in USD
  // cents and applied to the next consultation booking.
  referralCode?: string;
  /** Referral credit balance in USD cents. Earned when referrals
   *  qualify (referee's first paid consultation). Spent at booking
   *  time as a discount on the consultation fee. */
  referralCreditCents?: number;
}

export interface UserIdentity {
  status: "unverified" | "pending" | "verified" | "rejected";
  // Type of government document the user uploaded. Free-form because
  // this varies by country — "Aadhaar", "Passport", "Driver's License",
  // "PAN", "National ID", etc. UI offers common picks + "Other".
  docType?: string;
  // Remote URL from our blob service; stored as-uploaded.
  docUrl?: string;
  // Filename the user uploaded, for admin-review UI only.
  docFilename?: string;
  submittedAt?: string;
  reviewedAt?: string;
  // Admin user id that approved / rejected.
  reviewedBy?: string;
  // Free-form note from the reviewer. Surfaced to the user when rejected
  // so they know what to fix before re-uploading.
  reviewNote?: string;
}

const users: User[] = [];
const { hydrate, reload, flush, tombstone } = bindPersistentArray<User>(
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

// Backfill Medical IDs + identity state for every pre-existing user row.
// This runs once per cold boot; the `medicalId ?` check makes it a no-op
// for rows that already have one, so it's safe to run repeatedly. The
// collision check uses the in-memory array which is cheap at our scale.
(function backfillMedicalIds() {
  let dirty = false;
  const taken = new Set(users.map((u) => u.medicalId).filter(Boolean) as string[]);
  for (const u of users) {
    if (!u.medicalId) {
      const id = generateUniqueMedicalId((cand) => taken.has(cand));
      taken.add(id);
      u.medicalId = id;
      dirty = true;
    }
    if (!u.identity) {
      u.identity = { status: "unverified" };
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
  const taken = new Set(users.map((u) => u.medicalId).filter(Boolean) as string[]);
  const codes = new Set(users.map((u) => u.referralCode).filter(Boolean) as string[]);
  // Country may arrive either as ISO alpha-2 ("IN") or — historically —
  // as the country name ("India"). We canonicalise once on the way in
  // so consultation-eligibility checks don't have to re-normalise on
  // every read. Names longer than 2 chars get a best-effort look-up
  // against our currency catalogue's country index (which knows that
  // "India" maps to "IN").
  let normalisedCountry: string | undefined;
  const rawCountry = (data as { country?: string }).country;
  if (typeof rawCountry === "string" && rawCountry.trim()) {
    const trimmed = rawCountry.trim();
    if (trimmed.length === 2) {
      normalisedCountry = trimmed.toUpperCase();
    } else {
      // Cheap full-name → ISO heuristic; we only need to handle the
      // values our /auth/register form emits. Anything else falls back
      // to slicing the first two letters (matches existing
      // /api/doctors/register behaviour).
      const lower = trimmed.toLowerCase();
      const knownNames: Record<string, string> = {
        india: "IN",
        "united states": "US",
        "united kingdom": "GB",
        canada: "CA",
        australia: "AU",
      };
      normalisedCountry = (knownNames[lower] || trimmed.slice(0, 2)).toUpperCase();
    }
  }

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
    medicalId: generateUniqueMedicalId((c) => taken.has(c)),
    identity: { status: "unverified" },
    country: normalisedCountry,
    referralCode: generateReferralCode((c) => codes.has(c)),
    referralCreditCents: 0,
  };
  users.push(newUser);
  flush();
  return newUser;
}

/** Generate a short, friendly referral code. 8 alphanumeric chars
 *  (no I/O/0/1 — too easy to mistype). Caller passes in a
 *  uniqueness predicate so we never collide with an existing code. */
export function generateReferralCode(taken: (c: string) => boolean): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    if (!taken(code)) return code;
  }
  // Pathological fallback — append timestamp suffix to escape collisions.
  return `R${Date.now().toString(36).toUpperCase().slice(-7)}`;
}

/** Lazy-migrate: ensure a user has a referralCode. Pre-existing
 *  rows from before the referral feature shipped don't have one,
 *  so we mint one on first read and persist immediately. */
export function ensureReferralCode(user: User): string {
  if (user.referralCode) return user.referralCode;
  const codes = new Set(
    users.map((u) => u.referralCode).filter(Boolean) as string[]
  );
  user.referralCode = generateReferralCode((c) => codes.has(c));
  if (user.referralCreditCents === undefined) user.referralCreditCents = 0;
  flush();
  return user.referralCode;
}

export function findUserByReferralCode(code: string): User | undefined {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  return users.find((u) => u.referralCode === upper);
}

/** Add credit to a user's referral wallet. Returns the new balance. */
export function addReferralCredit(userId: string, cents: number): number {
  const u = users.find((x) => x.id === userId);
  if (!u) return 0;
  u.referralCreditCents = (u.referralCreditCents || 0) + Math.max(0, Math.floor(cents));
  flush();
  return u.referralCreditCents;
}

/** Link an ABHA Health ID to an existing user. Idempotent — calling
 *  again with the same ABHA replaces the linkage timestamp. Caller
 *  must have already validated the ABHA via NHA's authenticator
 *  (or via the Phase-1 stub). India-only by upstream gating; we
 *  don't re-check country here. */
export function linkAbhaToUser(
  userId: string,
  patch: { abhaId: string; abhaAddress?: string },
): User | null {
  const u = users.find((x) => x.id === userId);
  if (!u) return null;
  u.abhaId = patch.abhaId.replace(/\s+/g, "");
  u.abhaAddress = patch.abhaAddress;
  u.abhaLinkedAt = new Date().toISOString();
  flush();
  return u;
}

export function unlinkAbhaFromUser(userId: string): User | null {
  const u = users.find((x) => x.id === userId);
  if (!u) return null;
  u.abhaId = undefined;
  u.abhaAddress = undefined;
  u.abhaLinkedAt = undefined;
  flush();
  return u;
}

/** Spend up to `cents` from a user's referral wallet. Returns the
 *  amount actually deducted (clamped to available balance). */
export function spendReferralCredit(userId: string, cents: number): number {
  const u = users.find((x) => x.id === userId);
  if (!u) return 0;
  const available = u.referralCreditCents || 0;
  const spend = Math.max(0, Math.min(available, Math.floor(cents)));
  u.referralCreditCents = available - spend;
  flush();
  return spend;
}

// ---------- Identity verification helpers ----------

export interface IdentityPublicView {
  medicalId: string;
  status: UserIdentity["status"];
  docType?: string;
  docFilename?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewNote?: string;
  /** ISO 3166-1 alpha-2 country code stored on the user record.
   *  Surfaced so the IdentityVerificationCard can show the right
   *  document-type list (Aadhaar/PAN for IN, Driver's License/SSN
   *  for US, Emirates ID for AE, etc.) without having to ask the
   *  user "where are you from" again. */
  country?: string;
}

export function getIdentity(userId: string): IdentityPublicView | null {
  const u = findUserById(userId);
  if (!u) return null;
  return {
    medicalId: u.medicalId || "",
    status: u.identity?.status || "unverified",
    docType: u.identity?.docType,
    docFilename: u.identity?.docFilename,
    submittedAt: u.identity?.submittedAt,
    reviewedAt: u.identity?.reviewedAt,
    reviewNote: u.identity?.reviewNote,
    country: u.country,
  };
}

/**
 * Patient/doctor submits a gov-ID document. Flips status to "pending"
 * so an admin's review queue picks it up. Re-submission after a
 * "rejected" verdict is allowed — we overwrite the prior doc and clear
 * the review note so the queue shows it as a fresh submission.
 */
export function submitIdentityDocument(
  userId: string,
  doc: { docType: string; docUrl: string; docFilename: string },
): User | null {
  const u = findUserById(userId);
  if (!u) return null;
  u.identity = {
    status: "pending",
    docType: doc.docType,
    docUrl: doc.docUrl,
    docFilename: doc.docFilename,
    submittedAt: new Date().toISOString(),
  };
  flush();
  return u;
}

export function approveIdentity(
  userId: string,
  reviewerId: string,
): User | null {
  const u = findUserById(userId);
  if (!u || !u.identity) return null;
  u.identity = {
    ...u.identity,
    status: "verified",
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewerId,
    reviewNote: undefined,
  };
  flush();
  return u;
}

export function rejectIdentity(
  userId: string,
  reviewerId: string,
  reviewNote: string,
): User | null {
  const u = findUserById(userId);
  if (!u || !u.identity) return null;
  u.identity = {
    ...u.identity,
    status: "rejected",
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewerId,
    reviewNote,
  };
  flush();
  return u;
}

export interface PendingVerification {
  userId: string;
  name: string;
  email: string;
  role: User["role"];
  medicalId: string;
  docType: string;
  docUrl: string;
  docFilename: string;
  submittedAt: string;
}

export function listPendingVerifications(): PendingVerification[] {
  return users
    .filter(
      (u) =>
        u.identity?.status === "pending" &&
        u.identity.docUrl &&
        u.identity.docType,
    )
    .map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      medicalId: u.medicalId || "",
      docType: u.identity!.docType!,
      docUrl: u.identity!.docUrl!,
      docFilename: u.identity!.docFilename || "document",
      submittedAt: u.identity!.submittedAt || u.createdAt,
    }))
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
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

// Whitelisted fields the mobile app (or any self-service path) is allowed to
// update on the user's own record. Email/role/password are NOT here on
// purpose — those have dedicated flows with extra checks.
export type SelfUpdatablePatch = Partial<{
  name: string;
  phone: string;
}>;

export function updateUserSelf(
  email: string,
  patch: SelfUpdatablePatch
): User | null {
  const u = findUserByEmail(email);
  if (!u) return null;
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (trimmed.length > 0 && trimmed.length <= 120) u.name = trimmed;
  }
  if (patch.phone !== undefined) {
    const trimmed = patch.phone.trim();
    if (trimmed.length <= 32) u.phone = trimmed;
  }
  flush();
  return u;
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
  // Tombstone first — otherwise the anti-clobber merge inside flush()
  // reads the still-present row from Postgres and re-adds it locally,
  // then writes that zombie back, undoing the delete.
  tombstone(id);
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
