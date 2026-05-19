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
        // ⚠️ STALE PLACEHOLDER — this fingerprint was generated for
        // an old com.saluent.doctor keystore before the brand pivoted
        // back to OduDoc. After the developer's first EAS build of
        // the renamed com.odudoc.doctor package, REPLACE this line
        // with the new fingerprint shown in the EAS build output
        // (or run: eas credentials → Android → production → keystore).
        "REPLACE_AFTER_FIRST_EAS_BUILD",
        // TODO: After first Play Store upload, add the Play App Signing
        // fingerprint here too — find it in Play Console → Setup → App
        // integrity → "App signing key certificate" → SHA-256.
      ],
    },
  },
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.odudoc.patient",
      sha256_cert_fingerprints: [
        // ⚠️ STALE PLACEHOLDER — this fingerprint was from an early
        // preview keystore before the rebuild. Replace with the
        // production keystore SHA-256 after the developer's first
        // EAS production build (visible in the build output, or
        // run: eas credentials → Android → production → keystore).
        "REPLACE_AFTER_FIRST_EAS_BUILD",
        // TODO: Add Play App Signing fingerprint after first Play Store
        // upload — Play Console → Setup → App integrity → SHA-256.
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
