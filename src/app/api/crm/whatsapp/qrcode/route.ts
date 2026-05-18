import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { evolutionApi } from "@/lib/crm/evolution-api";
import type { CrmSettings } from "@/types/crm";

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as Partial<CrmSettings>;

  try {
    const { qr, raw } = await evolutionApi.connect(body);
    return NextResponse.json({ qr, data: raw });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "QR failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
