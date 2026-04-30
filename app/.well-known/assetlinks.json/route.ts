// /.well-known/assetlinks.json
//
// Android App Links verification file. Google Play (and the OS, on
// install) hits https://www.odudoc.com/.well-known/assetlinks.json
// to confirm that this domain owner authorises the listed app
// packages to handle https://www.odudoc.com/d/* and /p/* URLs without
// the disambiguation chooser.
//
// Each app contributes:
//   - package_name      : the Android applicationId
//   - sha256_cert_fingerprints : the upload-key + Play-app-signing
//                                fingerprints, hex with colons
//
// To get the fingerprints (you only need to do this once per signing
// key — they don't change):
//
//   # Upload key (your local keystore):
//   keytool -list -v -keystore my-release-key.keystore -alias my-alias
//
//   # Play App Signing key (after first upload, shown in Play Console):
//   Play Console → your app → Setup → App integrity → "App signing
//   key certificate" → SHA-256 fingerprint
//
// BOTH must be listed below; otherwise verification fails for users
// who installed via Play Store (Play re-signs your APK with their
// key, so the on-device fingerprint differs from your upload key).
//
// FINGERPRINTS_REPLACE_ME — paste real values before publishing the
// apps. Until then, the file is served (so the URL works) but
// verification on real devices will fail until you fill them in.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-static";

const ASSET_LINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.odudoc.doctor",
      sha256_cert_fingerprints: [
        // Replace with the upload-key fingerprint:
        // "AA:BB:CC:DD:...",
        // And the Play App Signing fingerprint:
        // "11:22:33:44:...",
      ],
    },
  },
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.odudoc.patient",
      sha256_cert_fingerprints: [
        // Replace with patient-app upload-key + Play signing fingerprints
      ],
    },
  },
];

export async function GET() {
  return NextResponse.json(ASSET_LINKS, {
    headers: {
      "content-type": "application/json",
      // Critical: must NOT redirect, must be served HTTPS, must be
      // public. The browser/Play verifier rejects redirects.
      "cache-control": "public, max-age=300",
    },
  });
}
