// Per-unit pharmaceutical inventory — the "QR per unit" leg of the
// anti-counterfeit chain. Spec v6.0 §12, Cowork_Complete §13.
//
// One PharmaUnit row per physical box / strip / vial shipped from
// the manufacturer. Each carries a short alphanumeric serial that
// gets printed as a QR on the packaging. When anyone (pharmacy,
// patient) scans the QR, the verify API looks the serial up here +
// joins to the parent drug + batch record so it can answer:
//   - is this a real OduDoc-registered unit?
//   - has the batch been recalled?
//   - has anyone scanned this serial before (replay = potential
//     counterfeit; first-scan = legit dispense)?
//
// The serial is short (10 char base32) so it fits comfortably in a
// QR + on a printed strip without obscuring the brand artwork.

import crypto from "crypto";
import { bindPersistentArray } from "../persistent-array";

export interface PharmaUnit {
  /** Short serial — base32, 10 chars. The user-visible QR payload. */
  serial: string;
  /** Owning drug registration id (lib/pharma/catalogue-store). */
  drugId: string;
  /** Batch number this unit belongs to. */
  batchNumber: string;
  /** Pharma company that minted this unit. */
  organizationId: string;
  /** ISO datetime when the unit was minted. */
  mintedAt: string;
  /** Optional shipping metadata recorded by the manufacturer when
   *  units leave the warehouse. */
  shippedTo?: string;
  shippedAt?: string;
}

const units: PharmaUnit[] = [];
const { hydrate, flush } = bindPersistentArray<PharmaUnit>(
  "pharma_units",
  units,
  () => [],
);
await hydrate();

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // exclude I, O, 0, 1
function mintSerial(): string {
  const buf = crypto.randomBytes(10);
  let s = "";
  for (let i = 0; i < 10; i++) s += ALPHABET[buf[i] % ALPHABET.length];
  return s;
}

/** Mint a batch of units. Returns the serials. Idempotency is on the
 *  caller — if you call twice with the same batch, you get more
 *  units. */
export function mintUnits(input: {
  drugId: string;
  batchNumber: string;
  organizationId: string;
  count: number;
}): string[] {
  const at = new Date().toISOString();
  const out: string[] = [];
  for (let i = 0; i < input.count; i++) {
    // Retry on serial collision — astronomically unlikely with 10
    // base32 chars (10^15 keyspace) but cheap to guard against.
    let serial = mintSerial();
    while (units.some((u) => u.serial === serial)) serial = mintSerial();
    units.push({
      serial,
      drugId: input.drugId,
      batchNumber: input.batchNumber,
      organizationId: input.organizationId,
      mintedAt: at,
    });
    out.push(serial);
  }
  flush();
  return out;
}

export function findUnit(serial: string): PharmaUnit | null {
  return units.find((u) => u.serial.toUpperCase() === serial.toUpperCase()) || null;
}

export function listUnitsForBatch(drugId: string, batchNumber: string): PharmaUnit[] {
  return units.filter(
    (u) => u.drugId === drugId && u.batchNumber.toLowerCase() === batchNumber.toLowerCase(),
  );
}

/** Used by reload-via-cron + cross-Lambda freshness probes. */
export async function reloadUnits(): Promise<void> {
  await hydrate();
}
