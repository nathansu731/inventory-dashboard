import { NextResponse } from "next/server"
import { clearInventorySnapshot, loadInventorySnapshot, normalizeInventorySnapshotRows, saveInventorySnapshot, type InventorySnapshotSourceType } from "@/lib/inventory-snapshot"
import { withAuthCookies, getAuthenticatedApiContext } from "@/lib/server-auth"

const sanitizeDate = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null)

export async function GET() {
  const { cookiesToSet, errorResponse, tokenCtx } = await getAuthenticatedApiContext()
  if (errorResponse || !tokenCtx) return errorResponse!

  try {
    const snapshot = await loadInventorySnapshot(tokenCtx.tenantId)
    return withAuthCookies(
      NextResponse.json({
        hasSnapshot: snapshot.rows.length > 0,
        metadata: snapshot.metadata,
        rowCount: snapshot.rows.length,
      }),
      cookiesToSet
    )
  } catch {
    return withAuthCookies(NextResponse.json({ error: "failed_to_load_inventory_snapshot" }, { status: 500 }), cookiesToSet)
  }
}

export async function POST(request: Request) {
  const { cookiesToSet, errorResponse, tokenCtx } = await getAuthenticatedApiContext()
  if (errorResponse || !tokenCtx) return errorResponse!

  const payload = (await request.json().catch(() => null)) as {
    rows?: unknown
    asOfDate?: unknown
    sourceType?: unknown
  } | null

  const sourceType = String(payload?.sourceType || "inventory_csv").trim() as InventorySnapshotSourceType
  const rows = normalizeInventorySnapshotRows(payload?.rows)
  if (rows.length === 0) {
    return withAuthCookies(NextResponse.json({ error: "inventory_snapshot_empty" }, { status: 400 }), cookiesToSet)
  }

  const normalizedSourceType: InventorySnapshotSourceType =
    sourceType === "sales_csv" || sourceType === "manual" ? sourceType : "inventory_csv"

  try {
    const snapshot = await saveInventorySnapshot({
      tenantId: tokenCtx.tenantId,
      rows,
      asOfDate: sanitizeDate(payload?.asOfDate),
      sourceType: normalizedSourceType,
    })
    return withAuthCookies(
      NextResponse.json({
        status: "success",
        metadata: snapshot.metadata,
        rowCount: snapshot.rows.length,
      }),
      cookiesToSet
    )
  } catch {
    return withAuthCookies(NextResponse.json({ error: "failed_to_save_inventory_snapshot" }, { status: 500 }), cookiesToSet)
  }
}

export async function DELETE() {
  const { cookiesToSet, errorResponse, tokenCtx } = await getAuthenticatedApiContext()
  if (errorResponse || !tokenCtx) return errorResponse!

  try {
    await clearInventorySnapshot(tokenCtx.tenantId)
    return withAuthCookies(NextResponse.json({ status: "success" }), cookiesToSet)
  } catch {
    return withAuthCookies(NextResponse.json({ error: "failed_to_clear_inventory_snapshot" }, { status: 500 }), cookiesToSet)
  }
}
