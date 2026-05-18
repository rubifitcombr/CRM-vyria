import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { CRM_EVOLUTION_INSTANCE, evolutionApi } from "@/lib/crm/evolution-api";
import { saveCrmSettings } from "@/lib/crm/settings";
import type { CrmSettings } from "@/types/crm";

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as Partial<CrmSettings>;

  if (!body.evolution_base_url || !body.evolution_api_key) {
    return NextResponse.json(
      { error: "URL base e API Key são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    const instanceName = await evolutionApi.ensureCrmInstance(body);

    await saveCrmSettings({
      evolution_base_url: body.evolution_base_url,
      evolution_api_key: body.evolution_api_key,
      evolution_instance: instanceName,
    });

    const instance = await evolutionApi.getCrmInstance({
      ...body,
      evolution_instance: instanceName,
    });

    return NextResponse.json({
      ok: true,
      instance_name: instanceName,
      instance,
      message: `Instância dedicada "${CRM_EVOLUTION_INSTANCE}" criada. Use Gerar QR Code para conectar o WhatsApp.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar instância";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
