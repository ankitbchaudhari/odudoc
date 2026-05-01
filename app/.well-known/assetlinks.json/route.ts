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
        // EAS-managed upload keystore MXgiyiAy6g (default), generated
        // 2026-05-02 specifically for the com.saluent.doctor package
        // (EAS keys a keystore by [project, package_name], so the
        // package rename triggered a fresh keystore rather than reusing
        // the old com.odudoc.doctor one).
        "1E:AE:1C:6A:E6:C6:DC:7A:29:5B:70:A6:BE:ED:13:03:42:B1:CD:9D:FA:DF:C1:90:FC:C0:30:54:4F:9F:94:EA",
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
