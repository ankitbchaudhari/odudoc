// Orthanc PACS client — DICOMweb-flavoured wrapper.
//
// Orthanc is the open-source DICOM server we recommend in the v6.0
// stack (Section 42). It exposes a REST API and a DICOMweb API
// (QIDO-RS / WADO-RS). This client wraps the queries we actually
// need — list studies for a patient, fetch a study's metadata,
// generate a viewer URL — behind a single typed interface.
//
// Production wiring:
//   ORTHANC_URL=https://orthanc.your-hospital.example
//   ORTHANC_USERNAME=… ORTHANC_PASSWORD=…
//
// Without those env vars the client is in "offline" mode: every
// call returns an empty result with `offline: true` so callers can
// render a "PACS not connected" hint rather than crashing.

export interface OrthancStudy {
  studyInstanceUid: string;
  patientId: string;
  studyDate?: string;
  studyDescription?: string;
  modality?: string;
  numberOfSeries?: number;
  numberOfInstances?: number;
}

interface ClientConfig {
  url: string;
  auth?: string;
}

function getConfig(): ClientConfig | null {
  const url = process.env.ORTHANC_URL?.trim();
  if (!url) return null;
  const u = process.env.ORTHANC_USERNAME?.trim();
  const p = process.env.ORTHANC_PASSWORD?.trim();
  const auth = u && p ? `Basic ${Buffer.from(`${u}:${p}`).toString("base64")}` : undefined;
  return { url: url.replace(/\/$/, ""), auth };
}

async function orthancFetch(path: string): Promise<unknown> {
  const c = getConfig();
  if (!c) throw new Error("orthanc_not_configured");
  const r = await fetch(`${c.url}${path}`, {
    headers: c.auth ? { Authorization: c.auth, Accept: "application/json" } : { Accept: "application/json" },
    next: { revalidate: 30 },
  });
  if (!r.ok) throw new Error(`orthanc_http_${r.status}`);
  return r.json();
}

/** List studies for a patient by PatientID (typically MRN). */
export async function listStudiesForPatient(patientId: string): Promise<{ studies: OrthancStudy[]; offline: boolean }> {
  if (!getConfig()) return { studies: [], offline: true };
  try {
    // QIDO-RS — query studies by PatientID
    const j = (await orthancFetch(`/dicom-web/studies?PatientID=${encodeURIComponent(patientId)}`)) as Array<Record<string, { Value?: unknown[] }>>;
    const studies: OrthancStudy[] = j.map((s) => {
      const v = (tag: string): string | undefined => {
        const arr = s[tag]?.Value;
        return Array.isArray(arr) && arr.length ? String(arr[0]) : undefined;
      };
      return {
        studyInstanceUid: v("0020000D") || "",
        patientId: v("00100020") || patientId,
        studyDate: v("00080020"),
        studyDescription: v("00081030"),
        modality: v("00080061"),
        numberOfSeries: Number(v("00201206")) || undefined,
        numberOfInstances: Number(v("00201208")) || undefined,
      };
    });
    return { studies, offline: false };
  } catch {
    return { studies: [], offline: false };
  }
}

/** Build a WADO-RS viewer URL for a study. Used by the patient
 *  + doctor radiology pages to embed Orthanc's OHIF / Stone
 *  viewer (Orthanc bundles one, or self-host OHIF separately). */
export function studyViewerUrl(studyInstanceUid: string): string | null {
  const c = getConfig();
  if (!c) return null;
  // Orthanc's "Stone Web Viewer" plugin path:
  return `${c.url}/stone-webviewer/index.html?study=${encodeURIComponent(studyInstanceUid)}`;
}

export function orthancStatus(): { configured: boolean; url?: string } {
  const c = getConfig();
  return c ? { configured: true, url: c.url } : { configured: false };
}
