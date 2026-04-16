import bcrypt from "bcryptjs";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string; // hashed
  role: "patient" | "doctor" | "admin";
  createdAt: string;
}

// In-memory user store
const users: User[] = [];

// Pre-seed demo user
const DEMO_PASSWORD_HASH = bcrypt.hashSync("password123", 10);
users.push({
  id: "demo-user-001",
  name: "Demo User",
  email: "demo@odudoc.com",
  phone: "+1234567890",
  password: DEMO_PASSWORD_HASH,
  role: "patient",
  createdAt: new Date().toISOString(),
});

// Pre-seed demo doctor
const DEMO_DOCTOR_HASH = bcrypt.hashSync("doctor123", 10);
users.push({
  id: "demo-doctor-001",
  name: "Dr. Sarah Johnson",
  email: "doctor@odudoc.com",
  phone: "+1234567891",
  password: DEMO_DOCTOR_HASH,
  role: "doctor",
  createdAt: new Date().toISOString(),
});

// Pre-seed admin
const DEMO_ADMIN_HASH = bcrypt.hashSync("admin123", 10);
users.push({
  id: "admin-001",
  name: "OduDoc Admin",
  email: "admin@odudoc.com",
  phone: "+1234567892",
  password: DEMO_ADMIN_HASH,
  role: "admin",
  createdAt: new Date().toISOString(),
});

export function findUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function createUser(
  data: Omit<User, "id" | "createdAt" | "password"> & { password: string }
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
  };
  users.push(newUser);
  return newUser;
}

export function validatePassword(
  plainPassword: string,
  hashedPassword: string
): boolean {
  return bcrypt.compareSync(plainPassword, hashedPassword);
}
