"use client";

// Mounts once at the root layout to ensure the visitor cookie used by
// lib/experiments.ts exists. Idempotent — if the cookie is already
// present this is a no-op. Generates a new id on first paint
// otherwise so the very first request from a fresh browser still
// gets bucketed deterministically.

import { useEffect } from "react";
import { ensureVisitorIdClient } from "@/lib/experiments";

export default function ExperimentBootstrap() {
  useEffect(() => {
    ensureVisitorIdClient();
  }, []);
  return null;
}
