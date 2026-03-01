import { NextResponse } from "next/server"
import { listAdapterTemplates } from "@/lib/data-source-adapters"

export async function GET() {
  return NextResponse.json({ items: listAdapterTemplates() })
}
