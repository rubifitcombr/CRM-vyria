import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeNode, findTriggerNode } from "@/lib/crm/funnel-engine";
import type { Conversation, FunnelNode } from "@/types/crm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id: funnelId } = await params;
  const body = await request.json();
  const { conversation_id, node_id } = body;

  const supabase = createAdminClient();

  let conversation: Conversation | null = null;

  if (conversation_id) {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversation_id)
      .single();
    conversation = data as Conversation;
  }

  let node: FunnelNode | null = null;

  if (node_id) {
    const { data } = await supabase
      .from("funnel_nodes")
      .select("*")
      .eq("id", node_id)
      .single();
    node = data as FunnelNode;
  } else if (conversation?.current_node_id) {
    const { data } = await supabase
      .from("funnel_nodes")
      .select("*")
      .eq("id", conversation.current_node_id)
      .single();
    node = data as FunnelNode;
  } else {
    node = await findTriggerNode(funnelId);
  }

  if (!node || !conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await executeNode(node, conversation);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Execution failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
