import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { evolutionApi } from "@/lib/crm/evolution-api";
import { saveCrmSettings } from "@/lib/crm/settings";
import type { CrmSettings } from "@/types/crm";

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as Partial<CrmSettings> & {
    save?: boolean;
  };

  if (body.save !== false && body.evolution_instance) {
    await saveCrmSettings({
      evolution_base_url: body.evolution_base_url,
      evolution_api_key: body.evolution_api_key,
      evolution_instance: body.evolution_instance,
    });
  }

  try {
    const result = await evolutionApi.getStatus(body);
    return NextResponse.json({
      connected: result.connected,
      state: result.state,
      data: result.raw,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Connection failed";
    return NextResponse.json({ connected: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const result = await evolutionApi.getStatus();
    return NextResponse.json({
      connected: result.connected,
      state: result.state,
      data: result.raw,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Connection failed";
    return NextResponse.json({ connected: false, error: msg }, { status: 500 });
  }
}
