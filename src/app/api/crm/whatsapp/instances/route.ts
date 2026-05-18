import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { CRM_EVOLUTION_INSTANCE, evolutionApi } from "@/lib/crm/evolution-api";
import type { CrmSettings } from "@/types/crm";

/** Lista apenas instâncias do Vyria CRM (prefixo vyria_crm), nunca store_* do Delivery. */
export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as Partial<CrmSettings>;

  try {
    const instances = await evolutionApi.listCrmInstances(body);
    const dedicated = instances.find((i) => i.name === CRM_EVOLUTION_INSTANCE);

    return NextResponse.json({
      instances,
      dedicated,
      instance_name: CRM_EVOLUTION_INSTANCE,
      has_dedicated: !!dedicated,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list instances";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
