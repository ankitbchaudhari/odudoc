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
      package_name: "com.saluent.doctor",
      sha256_cert_fingerprints: [
        // EAS-managed upload keystore (build profile: preview/production).
        // Renamed from com.odudoc.doctor → com.saluent.doctor on
        // 2026-05-01 because the original package name had a stale
        // signing-key claim from a defunct prior build that we couldn't
        // recover. Signing keystore (and SHA-256) is unchanged because
        // EAS keystores are tied to the Expo project, not the package
        // name. If you ever rotate the keystore, add the new fingerprint
        // alongside this one.
        "F6:3D:E3:16:9E:D5:A7:11:2E:1D:B9:56:3D:52:5A:E6:2E:90:37:7F:38:A6:EC:F9:B6:1F:32:31:FB:88:63:D6",
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
        // EAS-managed upload keystore zPRVramS3I (default), generated
        // 2026-05-01 during the patient app's first preview build.
        "E9:63:FF:A1:E5:29:10:20:D2:D7:B2:2A:B4:32:B8:5A:D5:96:DD:CF:1D:FE:A4:81:47:4F:22:74:6D:4A:90:DA",
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
