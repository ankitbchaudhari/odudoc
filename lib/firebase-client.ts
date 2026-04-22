"use client";

// Client-side Firebase wrapper used by the OTP flow.
// Phone authentication is performed on the browser via Firebase's SDK with
// an invisible reCAPTCHA; the resulting ID token is forwarded to our
// `/api/consult/firebase/verify` endpoint, which re-validates it with the
// Admin SDK and mints the existing consultToken the rest of the app uses.

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }
  app = initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  const auth = getAuth(getFirebaseApp());
  // Match the client locale to the browser so the SMS body arrives in the
  // user's language where Firebase supports it.
  auth.useDeviceLanguage();
  return auth;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}
