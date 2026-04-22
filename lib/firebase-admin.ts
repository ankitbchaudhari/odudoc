// Server-side Firebase Admin wrapper. Used only to verify ID tokens
// produced by the client Phone Auth flow — we never create users here,
// we just confirm the token is real and extract the phone number.
//
// Env:
//   FIREBASE_ADMIN_PROJECT_ID    — the Firebase project id
//   FIREBASE_ADMIN_CLIENT_EMAIL  — service-account email
//   FIREBASE_ADMIN_PRIVATE_KEY   — service-account PEM (use literal \n for newlines)

import {
  initializeApp,
  getApps,
  cert,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

let app: App | null = null;

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  );
}

export function getAdminApp(): App {
  if (app) return app;
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }
  // Convert the single-line env-var form of the private key (where
  // newlines have been escaped to "\n") back into a real PEM.
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(
    /\\n/g,
    "\n",
  );
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey,
    }),
  });
  return app;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
