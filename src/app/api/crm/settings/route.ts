import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { getCrmSettings, saveCrmSettings } from "@/lib/crm/settings";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  const settings = await getCrmSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;
  const body = await request.json();
  await saveCrmSettings(body);
  return NextResponse.json({ ok: true });
}
