import { createAdminClient } from "@/lib/supabase/admin";
import { evolutionApi } from "@/lib/crm/evolution-api";
import { renderVariables } from "@/lib/crm/variables";
import type {
  Contact,
  Conversation,
  FunnelEdge,
  FunnelNode,
  Message,
} from "@/types/crm";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

async function logAction(
  supabase: SupabaseAdmin,
  conversationId: string,
  nodeId: string | null,
  action: string,
  result: string,
  error?: string
) {
  await supabase.from("funnel_logs").insert({
    conversation_id: conversationId,
    node_id: nodeId,
    action,
    result,
    error: error ?? null,
  });
}

async function getContact(
  supabase: SupabaseAdmin,
  contactId: string
): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();
  if (error || !data) throw new Error("Contact not found");
  return data as Contact;
}

async function getEdges(
  supabase: SupabaseAdmin,
  funnelId: string,
  sourceNodeId: string
): Promise<FunnelEdge[]> {
  const { data } = await supabase
    .from("funnel_edges")
    .select("*")
    .eq("funnel_id", funnelId)
    .eq("source_node_id", sourceNodeId);
  return (data ?? []) as FunnelEdge[];
}

async function getNode(
  supabase: SupabaseAdmin,
  nodeId: string
): Promise<FunnelNode | null> {
  const { data } = await supabase
    .from("funnel_nodes")
    .select("*")
    .eq("id", nodeId)
    .single();
  return data as FunnelNode | null;
}

async function saveOutboundMessage(
  supabase: SupabaseAdmin,
  conversation: Conversation,
  contact: Contact,
  type: string,
  content: string,
  mediaUrl: string | null,
  sentBy: "auto" | "manual" = "auto"
) {
  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    contact_id: contact.id,
    direction: "outbound",
    type,
    content,
    media_url: mediaUrl,
    status: "sent",
    sent_by: sentBy,
  });
  await supabase
    .from("contacts")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", contact.id);
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id);
}

export async function evaluateCondition(
  config: Record<string, unknown>,
  conversation: Conversation,
  contact: Contact,
  lastInbound?: Message | null
): Promise<boolean> {
  const supabase = createAdminClient();
  const condition = config.condition as string;

  switch (condition) {
    case "has_response":
      return !!lastInbound;
    case "has_tag": {
      const tagId = config.tag_id as string;
      const { data } = await supabase
        .from("contact_tags")
        .select("tag_id")
        .eq("contact_id", contact.id)
        .eq("tag_id", tagId)
        .maybeSingle();
      return !!data;
    }
    case "in_stage": {
      const stageId = config.stage_id as string;
      const { data } = await supabase
        .from("contact_pipeline")
        .select("stage_id")
        .eq("contact_id", contact.id)
        .maybeSingle();
      return data?.stage_id === stageId;
    }
    case "contains_word": {
      const word = (config.word as string)?.toLowerCase();
      const text = lastInbound?.content?.toLowerCase() ?? "";
      return word ? text.includes(word) : false;
    }
    default:
      return false;
  }
}

export async function executeNode(
  node: FunnelNode,
  conversation: Conversation,
  options?: { testMode?: boolean; triggerMessage?: Message | null }
): Promise<void> {
  const supabase = createAdminClient();
  const contact = await getContact(supabase, conversation.contact_id);
  const testMode = options?.testMode ?? false;

  if (conversation.status === "paused" && !testMode) {
    return;
  }

  await logAction(
    supabase,
    conversation.id,
    node.id,
    `execute_${node.type}`,
    "started"
  );

  try {
    switch (node.type) {
      case "trigger":
        await advanceToNext(supabase, node, conversation, testMode);
        break;

      case "message": {
        const config = node.config as Record<string, unknown>;
        const msgType = (config.messageType as string) ?? "text";
        const delay = Number(config.delay ?? 0);
        const typing = Boolean(config.typing);
        const waitForReply = config.waitForReply !== false;

        if (!testMode) {
          if (delay > 0) {
            await new Promise((r) => setTimeout(r, delay * 1000));
          }
          if (typing) {
            await evolutionApi.sendTyping(contact.phone, delay || 3);
          }

          await sendFunnelMessage(supabase, contact, conversation, config, msgType);
        } else {
          await logAction(
            supabase,
            conversation.id,
            node.id,
            "message",
            `[TEST] Would send ${msgType}${waitForReply ? " + wait reply" : ""}`
          );
        }

        if (waitForReply && !testMode) {
          await pauseForResponse(supabase, node, conversation, "message_wait_reply");
          return;
        }

        await advanceToNext(supabase, node, conversation, testMode);
        break;
      }

      case "wait": {
        const config = node.config as Record<string, unknown>;
        const waitType = config.waitType as string;

        if (waitType === "response") {
          await pauseForResponse(supabase, node, conversation, "wait_for_response");
          return;
        }

        const amount = Number(config.amount ?? 1);
        const unit = (config.unit as string) ?? "minutes";
        const multipliers: Record<string, number> = {
          minutes: 60 * 1000,
          hours: 60 * 60 * 1000,
          days: 24 * 60 * 60 * 1000,
        };
        const ms = amount * (multipliers[unit] ?? multipliers.minutes);
        const scheduledFor = new Date(Date.now() + ms).toISOString();

        const edges = await getEdges(supabase, node.funnel_id, node.id);
        const nextEdge = edges[0];

        if (nextEdge && !testMode) {
          await supabase.from("message_queue").insert({
            conversation_id: conversation.id,
            contact_id: contact.id,
            node_id: nextEdge.target_node_id,
            type: "text",
            content: "__continue_funnel__",
            scheduled_for: scheduledFor,
          });
        }

        await supabase
          .from("conversations")
          .update({
            status: "waiting",
            current_node_id: node.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversation.id);

        await logAction(
          supabase,
          conversation.id,
          node.id,
          "wait",
          `scheduled for ${scheduledFor}`
        );
        break;
      }

      case "condition": {
        const result = await evaluateCondition(
          node.config as Record<string, unknown>,
          conversation,
          contact,
          options?.triggerMessage ?? null
        );
        const edges = await getEdges(supabase, node.funnel_id, node.id);
        const nextEdge = edges.find(
          (e) => e.condition_value === (result ? "yes" : "no")
        );
        if (nextEdge) {
          const nextNode = await getNode(supabase, nextEdge.target_node_id);
          if (nextNode) {
            await supabase
              .from("conversations")
              .update({ current_node_id: nextNode.id })
              .eq("id", conversation.id);
            await executeNode(nextNode, {
              ...conversation,
              current_node_id: nextNode.id,
            }, options);
          }
        }
        break;
      }

      case "tag": {
        const config = node.config as Record<string, unknown>;
        const tagId = config.tag_id as string;
        const action = config.action as string;

        if (!testMode && tagId) {
          if (action === "remove") {
            await supabase
              .from("contact_tags")
              .delete()
              .eq("contact_id", contact.id)
              .eq("tag_id", tagId);
          } else {
            await supabase.from("contact_tags").upsert({
              contact_id: contact.id,
              tag_id: tagId,
            });
          }
        }
        await advanceToNext(supabase, node, conversation, testMode);
        break;
      }

      case "move_stage": {
        const config = node.config as Record<string, unknown>;
        const stageId = config.stage_id as string;
        if (!testMode && stageId) {
          await supabase.from("contact_pipeline").upsert({
            contact_id: contact.id,
            stage_id: stageId,
            funnel_id: conversation.funnel_id,
            moved_at: new Date().toISOString(),
          });
        }
        await advanceToNext(supabase, node, conversation, testMode);
        break;
      }

      case "webhook": {
        const config = node.config as Record<string, unknown>;
        const url = config.url as string;
        const method = (config.method as string) ?? "POST";
        let body = (config.body as string) ?? "{}";
        body = renderVariables(body, contact);

        if (!testMode && url) {
          await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: method === "GET" ? undefined : body,
          });
        }
        await advanceToNext(supabase, node, conversation, testMode);
        break;
      }

      case "end":
        await supabase
          .from("conversations")
          .update({
            status: "completed",
            current_node_id: node.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversation.id);
        await logAction(
          supabase,
          conversation.id,
          node.id,
          "end",
          "completed"
        );
        break;

      default:
        await advanceToNext(supabase, node, conversation, testMode);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await logAction(
      supabase,
      conversation.id,
      node.id,
      `execute_${node.type}`,
      "failed",
      message
    );
    await supabase
      .from("conversations")
      .update({ status: "failed" })
      .eq("id", conversation.id);
    throw err;
  }
}

async function pauseForResponse(
  supabase: SupabaseAdmin,
  node: FunnelNode,
  conversation: Conversation,
  logResult: string
) {
  await supabase
    .from("conversations")
    .update({
      status: "waiting",
      current_node_id: node.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);
  await logAction(supabase, conversation.id, node.id, "wait", logResult);
}

async function sendFunnelMessage(
  supabase: SupabaseAdmin,
  contact: Contact,
  conversation: Conversation,
  config: Record<string, unknown>,
  msgType: string
) {
  const caption = renderVariables((config.text as string) ?? "", contact);
  const mediaUrl = (config.media_url as string) || null;

  switch (msgType) {
    case "text": {
      const text = caption;
      if (!text.trim()) break;
      await evolutionApi.sendText(contact.phone, text);
      await saveOutboundMessage(supabase, conversation, contact, "text", text, null);
      break;
    }
    case "link": {
      const linkUrl = renderVariables((config.link_url as string) ?? "", contact);
      if (!linkUrl.trim()) break;
      const body = caption.trim() ? `${caption}\n\n${linkUrl}` : linkUrl;
      await evolutionApi.sendText(contact.phone, body);
      await saveOutboundMessage(supabase, conversation, contact, "text", body, null);
      break;
    }
    case "audio": {
      if (!mediaUrl) break;
      await evolutionApi.sendAudio(contact.phone, mediaUrl);
      await saveOutboundMessage(
        supabase,
        conversation,
        contact,
        "audio",
        caption || "Áudio",
        mediaUrl
      );
      break;
    }
    case "video": {
      if (!mediaUrl) break;
      await evolutionApi.sendVideo(contact.phone, mediaUrl, caption || undefined);
      await saveOutboundMessage(
        supabase,
        conversation,
        contact,
        "video",
        caption || "Vídeo",
        mediaUrl
      );
      break;
    }
    case "image": {
      if (!mediaUrl) break;
      await evolutionApi.sendImage(contact.phone, mediaUrl, caption || undefined);
      await saveOutboundMessage(
        supabase,
        conversation,
        contact,
        "image",
        caption || "Imagem",
        mediaUrl
      );
      break;
    }
    case "document": {
      if (!mediaUrl) break;
      const fileName = (config.file_name as string) || "arquivo";
      await evolutionApi.sendDocument(contact.phone, mediaUrl, fileName);
      await saveOutboundMessage(
        supabase,
        conversation,
        contact,
        "document",
        caption || fileName,
        mediaUrl
      );
      break;
    }
  }
}

async function resumeAfterResponse(
  supabase: SupabaseAdmin,
  node: FunnelNode,
  conversation: Conversation
) {
  await supabase
    .from("conversations")
    .update({
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);
  await advanceToNext(supabase, node, conversation, false);
}

async function advanceToNext(
  supabase: SupabaseAdmin,
  node: FunnelNode,
  conversation: Conversation,
  testMode: boolean
) {
  const edges = await getEdges(supabase, node.funnel_id, node.id);
  const nextEdge = edges.find((e) => !e.condition_value) ?? edges[0];
  if (!nextEdge) return;

  const nextNode = await getNode(supabase, nextEdge.target_node_id);
  if (!nextNode) return;

  await supabase
    .from("conversations")
    .update({
      current_node_id: nextNode.id,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);

  await executeNode(
    nextNode,
    { ...conversation, current_node_id: nextNode.id, status: "active" },
    { testMode }
  );
}

export async function findTriggerNode(
  funnelId: string
): Promise<FunnelNode | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("funnel_nodes")
    .select("*")
    .eq("funnel_id", funnelId)
    .eq("type", "trigger")
    .limit(1)
    .maybeSingle();
  return data as FunnelNode | null;
}

export async function matchFunnelTrigger(
  messageText: string,
  isNewContact: boolean
): Promise<{ funnelId: string; triggerNode: FunnelNode } | null> {
  const supabase = createAdminClient();
  const { data: funnels } = await supabase
    .from("funnels")
    .select("*")
    .eq("active", true);

  if (!funnels?.length) return null;

  const text = messageText.toLowerCase().trim();

  for (const funnel of funnels) {
    const { data: trigger } = await supabase
      .from("funnel_nodes")
      .select("*")
      .eq("funnel_id", funnel.id)
      .eq("type", "trigger")
      .limit(1)
      .maybeSingle();

    if (!trigger) continue;

    const config = trigger.config as Record<string, unknown>;
    const triggerType =
      (config.triggerType as string) ?? funnel.trigger_type ?? "keyword";

    if (triggerType === "new_contact" && isNewContact) {
      return { funnelId: funnel.id, triggerNode: trigger as FunnelNode };
    }

    if (triggerType === "keyword") {
      const keyword =
        (config.keyword as string) ?? funnel.trigger_keyword ?? "";
      if (keyword && text.includes(keyword.toLowerCase())) {
        return { funnelId: funnel.id, triggerNode: trigger as FunnelNode };
      }
    }
  }

  return null;
}

export async function processInboundForFunnel(
  contactId: string,
  conversationId: string,
  message: Message
): Promise<void> {
  const supabase = createAdminClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (!conversation) return;

  const conv = conversation as Conversation;

  if (conv.status === "waiting" && conv.current_node_id) {
    const node = await getNode(supabase, conv.current_node_id);
    if (node?.type === "wait") {
      const config = node.config as Record<string, unknown>;
      if (config.waitType === "response") {
        await resumeAfterResponse(supabase, node, conv);
        return;
      }
    }
    if (node?.type === "message") {
      const config = node.config as Record<string, unknown>;
      if (config.waitForReply !== false) {
        await resumeAfterResponse(supabase, node, conv);
        return;
      }
    }
  }

  if (conv.funnel_id && conv.current_node_id && conv.status === "active") {
    const node = await getNode(supabase, conv.current_node_id);
    if (node?.type === "condition") {
      await executeNode(node, conv, { triggerMessage: message });
      return;
    }
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("contact_id", contactId)
    .eq("status", "active")
    .not("funnel_id", "is", null)
    .maybeSingle();

  if (existing) return;

  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("contact_id", contactId)
    .eq("direction", "inbound");

  const isNewContact = (count ?? 0) <= 1;
  const match = await matchFunnelTrigger(message.content ?? "", isNewContact);

  if (!match) return;

  const { data: funnelConv } = await supabase
    .from("conversations")
    .update({
      funnel_id: match.funnelId,
      current_node_id: match.triggerNode.id,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", conv.id)
    .select()
    .single();

  if (funnelConv) {
    await executeNode(match.triggerNode, funnelConv as Conversation, {
      triggerMessage: message,
    });
  }
}
