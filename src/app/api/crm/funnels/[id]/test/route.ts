import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeNode, findTriggerNode } from "@/lib/crm/funnel-engine";
import { getCrmSettings } from "@/lib/crm/settings";
import { normalizePhone } from "@/lib/utils";
import type { Conversation } from "@/types/crm";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id: funnelId } = await params;
  const settings = await getCrmSettings();
  const testPhone = normalizePhone(settings.test_phone ?? "");

  if (!testPhone) {
    return NextResponse.json(
      { error: "Configure o número de teste nas configurações" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  let { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("phone", testPhone)
    .maybeSingle();

  if (!contact) {
    const { data } = await supabase
      .from("contacts")
      .insert({ phone: testPhone, name: "Teste" })
      .select()
      .single();
    contact = data;
  }

  const triggerNode = await findTriggerNode(funnelId);
  if (!triggerNode || !contact) {
    return NextResponse.json({ error: "Trigger not found" }, { status: 404 });
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .insert({
      contact_id: contact.id,
      funnel_id: funnelId,
      current_node_id: triggerNode.id,
      status: "active",
    })
    .select()
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation error" }, { status: 500 });
  }

  const logs: string[] = [];

  try {
    await executeNode(triggerNode, conversation as Conversation, {
      testMode: true,
    });

    const { data: funnelLogs } = await supabase
      .from("funnel_logs")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    funnelLogs?.forEach((l) => {
      logs.push(`[${l.action}] ${l.result}${l.error ? ` — ${l.error}` : ""}`);
    });

    await supabase
      .from("conversations")
      .update({ status: "completed" })
      .eq("id", conversation.id);

    return NextResponse.json({ ok: true, logs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Test failed";
    return NextResponse.json({ error: msg, logs }, { status: 500 });
  }
}
