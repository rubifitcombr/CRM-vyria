import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { evolutionApi } from "@/lib/crm/evolution-api";
import { saveCrmSettings } from "@/lib/crm/settings";
import type { CrmSettings } from "@/types/crm";

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = (await request.json()) as Partial<CrmSettings> & {
    save?: boolean;
  };

  if (body.save !== false) {
    await saveCrmSettings({
      evolution_base_url: body.evolution_base_url,
      evolution_api_key: body.evolution_api_key,
      evolution_instance: body.evolution_instance,
    });
  }

  try {
    const status = await evolutionApi.getStatus(body);
    if (status.connected) {
      return NextResponse.json({
        connected: true,
        state: status.state,
        message: "WhatsApp já conectado",
      });
    }

    const { qr, raw } = await evolutionApi.connect(body);
    return NextResponse.json({
      connected: false,
      state: status.state,
      qr,
      raw,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Connect failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
