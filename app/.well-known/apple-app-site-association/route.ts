// /.well-known/apple-app-site-association
//
// iOS Universal Links verification file. Apple downloads this on app
// install (and periodically refreshes) to confirm that this domain
// authorises the listed apps to handle https://odudoc.com URLs without
// bouncing through Safari.
//
// AppID format: TEAMID.BUNDLEID
//   - TEAMID: 10-char Apple Developer team ID (look in Apple Developer
//     account → Membership → Team ID)
//   - BUNDLEID: matches the iOS bundleIdentifier in app.json
//                (com.odudoc.doctor / com.odudoc.patient)
//
// TEAMID_REPLACE_ME — paste your real Apple team ID before submitting
// the iOS apps to TestFlight / App Store.
//
// Path patterns:
//   /d/*  → doctor app (consultations, EMR, prescriptions)
//   /p/*  → patient app (bookings, prescriptions, etc.)
// Reserving these prefixes keeps the rest of odudoc.com (marketing,
// admin, /pricing, /for-doctors, etc.) opening normally in Safari
// even when the apps are installed.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-static";

const TEAM_ID = "TEAMID_REPLACE_ME";

const AASA = {
  applinks: {
    apps: [],
    details: [
      {
        appIDs: [`${TEAM_ID}.com.odudoc.doctor`],
        components: [
          { "/": "/d/*", comment: "Doctor-app deep links" },
        ],
      },
      {
        appIDs: [`${TEAM_ID}.com.odudoc.patient`],
        components: [
          { "/": "/p/*", comment: "Patient-app deep links" },
        ],
      },
    ],
  },
  webcredentials: {
    apps: [
      `${TEAM_ID}.com.odudoc.doctor`,
      `${TEAM_ID}.com.odudoc.patient`,
    ],
  },
};

export async function GET() {
  return new NextResponse(JSON.stringify(AASA), {
    headers: {
      // Apple requires application/json with NO charset suffix and
      // NO redirects. Must be served over HTTPS.
      "content-type": "application/json",
      "cache-control": "public, max-age=300",
    },
  });
}
