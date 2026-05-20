import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { evolutionApi } from "@/lib/crm/evolution-api";
import { saveCrmSettings } from "@/lib/crm/settings";
import type { CrmSettings } from "@/types/crm";

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = (await request.json()) as Partial<CrmSettings> & {
    webhook_url?: string;
    action?: "configure" | "check";
  };

  const webhookUrl =
    body.webhook_url ??
    `${request.nextUrl.origin}/api/crm/webhooks/whatsapp`;

  if (body.evolution_instance) {
    await saveCrmSettings({
      evolution_base_url: body.evolution_base_url,
      evolution_api_key: body.evolution_api_key,
      evolution_instance: body.evolution_instance,
    });
  }

  try {
    if (body.action === "check") {
      const webhook = await evolutionApi.getWebhook(body);
      return NextResponse.json({ ok: true, webhook });
    }

    const result = await evolutionApi.setWebhook(webhookUrl, body);
    return NextResponse.json({ ok: true, webhook_url: webhookUrl, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook setup failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
