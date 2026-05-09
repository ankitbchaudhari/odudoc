// Mark an erasure request as completed. Super-admin clicks this once
// the underlying data has been purged from every relevant store.
//
// Optionally cascades a soft delete across the consent vault + family
// store + safety context. We deliberately keep the audit log intact —
// regulators expect proof the deletion was actually carried out.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/tenant";
import {
  markErasureCompleted,
  deleteVaultConsentsForUser,
} from "@/lib/consent-vault-store";
import { deleteConsentsForOwner } from "@/lib/health-passport-store";
import { deleteDependentsForOwner } from "@/lib/family-store";
import { recordAudit } from "@/lib/audit-log-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, ctxParam: RouteCtx) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!isSuperAdmin(email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctxParam.params;
  const r = markErasureCompleted(id);
  if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Cascade purges across the stores we own. User-row deletion is
  // intentionally NOT done here — we want a super-admin to confirm
  // the User row drop separately so accidents are recoverable.
  const vaultPurged = deleteVaultConsentsForUser(r.userId);
  const passportPurged = deleteConsentsForOwner(r.userId);
  const dependentsPurged = r.retainDependents ? 0 : deleteDependentsForOwner(r.userId);
  recordAudit({
    actorEmail: email!,
    action: "user.delete",
    summary: `Erasure completed for user ${r.userId}`,
    meta: {
      erasureId: id,
      vaultPurged,
      passportPurged,
      dependentsPurged,
      retainDependents: r.retainDependents,
    },
  });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ request: r, purges: { vault: vaultPurged, passport: passportPurged, dependents: dependentsPurged } });
}
