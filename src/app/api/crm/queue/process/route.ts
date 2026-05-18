import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/crm/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeNode } from "@/lib/crm/funnel-engine";
import type { Conversation, FunnelNode } from "@/types/crm";

export async function GET(request: NextRequest) {
  const authorized = await requireCronAuth(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: queue } = await supabase
    .from("message_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .limit(20);

  let processed = 0;

  for (const item of queue ?? []) {
    await supabase
      .from("message_queue")
      .update({ status: "processing" })
      .eq("id", item.id);

    try {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", item.conversation_id)
        .single();

      if (!conversation) throw new Error("Conversation not found");

      const node = await getNodeFromDb(supabase, item.node_id);
      if (!node) throw new Error("Node not found");

      await supabase
        .from("conversations")
        .update({ status: "active", current_node_id: node.id })
        .eq("id", conversation.id);

      await executeNode(node, conversation as Conversation);

      await supabase
        .from("message_queue")
        .update({ status: "sent" })
        .eq("id", item.id);

      processed++;
    } catch (e) {
      const attempts = (item.attempts ?? 0) + 1;
      await supabase
        .from("message_queue")
        .update({
          status: attempts >= 3 ? "failed" : "pending",
          attempts,
        })
        .eq("id", item.id);
    }
  }

  return NextResponse.json({ processed });
}

async function getNodeFromDb(
  supabase: ReturnType<typeof createAdminClient>,
  nodeId: string
): Promise<FunnelNode | null> {
  const { data } = await supabase
    .from("funnel_nodes")
    .select("*")
    .eq("id", nodeId)
    .single();
  return data as FunnelNode | null;
}
