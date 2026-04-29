// EMR bulk patient import — CSV upload.
//
// Accepts a multipart `file` field whose body is a CSV with a header
// row. Headers are matched case-insensitively against a flexible
// alias table (so "First Name", "first_name", "GIVEN" all map to
// firstName). Required columns: firstName, lastName, phone — every
// other column is optional. Rows missing requireds are reported
// back as errors but don't block the rest of the import.
//
// Imported patients are tagged with importedAt so they don't count
// against the 50/month free quota — the cap is for net-new
// OduDoc patients, not the doctor's existing migration backlog.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  bulkImportPatients,
  resolveClinic,
  canWrite,
  writeAudit,
  type BulkImportRowInput,
  type Sex,
} from "@/lib/emr-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB CSV — comfortable for ~50k rows
const MAX_ROWS = 10_000;

/** Header alias map — lowercased + non-alphanumeric stripped. */
const HEADER_ALIASES: Record<string, keyof BulkImportRowInput> = {
  firstname: "firstName",
  givenname: "firstName",
  given: "firstName",
  fname: "firstName",
  first: "firstName",
  lastname: "lastName",
  surname: "lastName",
  familyname: "lastName",
  lname: "lastName",
  last: "lastName",
  age: "age",
  sex: "sex",
  gender: "sex",
  phone: "phone",
  mobile: "phone",
  contact: "phone",
  phonenumber: "phone",
  cell: "phone",
  email: "email",
  emailaddress: "email",
  address: "address",
  addr: "address",
  bloodgroup: "bloodGroup",
  blood: "bloodGroup",
  bloodtype: "bloodGroup",
  allergies: "allergies",
  allergy: "allergies",
  chronicconditions: "chronicConditions",
  conditions: "chronicConditions",
  chronic: "chronicConditions",
  medicalhistory: "chronicConditions",
  history: "chronicConditions",
  notes: "notes",
  comments: "notes",
  remarks: "notes",
};

function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Minimal CSV parser handling quoted fields, escaped quotes, and
 *  CRLF / LF line endings. Doesn't handle newlines inside quoted
 *  fields — fine for patient demographics where address might wrap
 *  but rarely with embedded newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  // Strip BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  // Normalise CRLF + lone CR to LF.
  text = text.replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += c;
        }
      } else {
        if (c === ",") {
          cells.push(cur);
          cur = "";
        } else if (c === '"' && cur === "") {
          inQuotes = true;
        } else {
          cur += c;
        }
      }
    }
    cells.push(cur);
    rows.push(cells.map((s) => s.trim()));
  }
  return rows;
}

function normaliseSex(raw: string): Sex {
  const s = raw.trim().toLowerCase();
  if (s === "male" || s === "m") return "Male";
  if (s === "female" || s === "f") return "Female";
  if (s === "other" || s === "o" || s === "non-binary" || s === "nb") return "Other";
  return "";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canWrite(clinic.role, "patients")) {
    return NextResponse.json(
      { error: "Your role can't import patients." },
      { status: 403 }
    );
  }

  const ct = req.headers.get("content-type") || "";
  if (!ct.startsWith("multipart/form-data")) {
    return NextResponse.json(
      { error: "multipart/form-data required" },
      { status: 415 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "CSV file required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `CSV too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 413 }
    );
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return NextResponse.json({ error: "Could not read CSV" }, { status: 400 });
  }

  const rows = parseCsv(text);
  if (rows.length < 2) {
    return NextResponse.json(
      { error: "CSV needs a header row and at least one data row" },
      { status: 400 }
    );
  }
  const header = rows[0];
  const dataRows = rows.slice(1);
  if (dataRows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (max ${MAX_ROWS} per import)` },
      { status: 413 }
    );
  }

  // Build a column-index → field-name map.
  const columnMap: Array<keyof BulkImportRowInput | null> = header.map(
    (h) => HEADER_ALIASES[normaliseHeader(h)] || null
  );
  // Sanity: at least firstName, lastName, phone columns must be mappable.
  const mappedFields = new Set(columnMap.filter(Boolean));
  const missing: string[] = [];
  if (!mappedFields.has("firstName")) missing.push("firstName");
  if (!mappedFields.has("lastName")) missing.push("lastName");
  if (!mappedFields.has("phone")) missing.push("phone");
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error:
          `Missing required columns: ${missing.join(", ")}. Accepted header aliases include "First Name", "Last Name", "Phone" / "Mobile" / "Contact". See the sample template.`,
      },
      { status: 400 }
    );
  }

  const inputs: BulkImportRowInput[] = dataRows.map((cells) => {
    const out: BulkImportRowInput = {};
    columnMap.forEach((field, idx) => {
      if (!field) return;
      const cell = cells[idx];
      if (cell === undefined) return;
      if (field === "sex") {
        out.sex = normaliseSex(cell);
      } else {
        (out as Record<string, string>)[field] = cell;
      }
    });
    return out;
  });

  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const result = await bulkImportPatients(ownerEmail, inputs);

  await writeAudit({
    ownerEmail,
    actorEmail: clinic.userEmail,
    action: "patient.create",
    resource: "patient",
    resourceId: `bulk-import-${Date.now()}`,
    meta: {
      via: "csv-import",
      imported: result.imported,
      skipped: result.skipped,
      filename: file.name,
    },
  });

  if (result.imported > 0) {
    try {
      await awaitAllFlushesStrict();
    } catch (err) {
      log.error("emr.patients.bulk_import_persist_failed", err, {
        ownerEmail,
        attempted: inputs.length,
      });
      return NextResponse.json(
        {
          error:
            "Some patients were saved but persistence is degraded — please verify and reimport any missing rows.",
          imported: result.imported,
          skipped: result.skipped,
          errors: result.errors,
        },
        { status: 503 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    imported: result.imported,
    skipped: result.skipped,
    errors: result.errors.slice(0, 50), // cap so the response isn't huge
    totalRows: dataRows.length,
  });
}

/** Sample CSV template — useful for the doctor to download as a
 *  starting point. Plain text so the response is one-shot. */
export async function GET() {
  const csv =
    [
      [
        "firstName",
        "lastName",
        "age",
        "sex",
        "phone",
        "email",
        "address",
        "bloodGroup",
        "allergies",
        "chronicConditions",
        "notes",
      ].join(","),
      [
        "Maria",
        "Gonzalez",
        "34",
        "Female",
        "+1 555 123 4567",
        "maria@example.com",
        "12 Park Road Madrid",
        "O+",
        "Penicillin",
        "Hypothyroid",
        "Annual review due May",
      ].join(","),
      [
        "James",
        "OConnor",
        "52",
        "Male",
        "+44 20 7946 0958",
        "",
        "",
        "B+",
        "",
        "Diabetes type 2; Hypertension",
        "",
      ].join(","),
    ].join("\n") + "\n";
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="odudoc-patient-import-template.csv"',
    },
  });
}
