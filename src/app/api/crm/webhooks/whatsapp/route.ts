import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processInboundForFunnel } from "@/lib/crm/funnel-engine";
import { normalizePhone } from "@/lib/utils";
import type { Message } from "@/types/crm";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.CRM_WEBHOOK_SECRET ?? "vyria-crm-2026";
  const secret =
    request.headers.get("x-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const event = String(body.event ?? body.type ?? "").toLowerCase();

  if (event === "connection.update") {
    return NextResponse.json({ ok: true });
  }

  if (event !== "messages.upsert") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const data = body.data ?? body;
  const messages = Array.isArray(data) ? data : [data];
  let processed = 0;

  for (const msg of messages) {
    const ok = await processMessage(msg as Record<string, unknown>);
    if (ok) processed += 1;
  }

  return NextResponse.json({ ok: true, processed });
}

async function processMessage(msg: Record<string, unknown>): Promise<boolean> {
  const messageEnvelope = (msg.message ?? {}) as Record<string, unknown>;
  const key = (msg.key ?? messageEnvelope.key ?? {}) as Record<string, unknown>;
  const remoteJid = getString((key as Record<string, unknown>)?.remoteJid) ?? getString(msg?.remoteJid);
  const fromMe = Boolean((key as Record<string, unknown>)?.fromMe ?? msg?.fromMe);

  if (!remoteJid || fromMe || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") {
    return false;
  }

  const phone = normalizePhone(remoteJid.split("@")[0]);
  const messageContent = extractMessageContent(msg);
  const messageType = extractMessageType(msg);

  const supabase = createAdminClient();

  let { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (!contact) {
    const message = (msg.message ?? {}) as Record<string, unknown>;
    const pushName = getString(msg?.pushName) ?? getString(message?.pushName);
    const { data: newContact } = await supabase
      .from("contacts")
      .insert({
        phone,
        name: pushName ?? null,
        last_seen_at: new Date().toISOString(),
      })
      .select()
      .single();
    contact = newContact;
  } else {
    await supabase
      .from("contacts")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", contact.id);
  }

  if (!contact) {
    throw new Error("Contact error");
  }

  let { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("contact_id", contact.id)
    .in("status", ["active", "waiting", "paused"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({ contact_id: contact.id, status: "active" })
      .select()
      .single();
    conversation = newConv;
  }

  if (!conversation) {
    throw new Error("Conversation error");
  }

  const { data: savedMessage } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      contact_id: contact.id,
      direction: "inbound",
      type: messageType,
      content: messageContent.text,
      media_url: messageContent.mediaUrl,
      status: "delivered",
      evolution_message_id: getString(key.id) ?? null,
    })
    .select()
    .single();

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id);

  if (savedMessage) {
    try {
      await processInboundForFunnel(
        contact.id,
        conversation.id,
        savedMessage as Message
      );
    } catch (e) {
      console.error("Funnel processing error:", e);
    }
  }

  return true;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function extractMessageContent(msg: Record<string, unknown>): {
  text: string;
  mediaUrl: string | null;
} {
  const message = (msg.message ?? msg) as Record<string, unknown>;
  if (message.conversation) return { text: message.conversation as string, mediaUrl: null };
  if (message.extendedTextMessage) {
    const ext = message.extendedTextMessage as { text?: string };
    return { text: ext.text ?? "", mediaUrl: null };
  }
  if (message.imageMessage) {
    const img = message.imageMessage as { caption?: string; url?: string };
    return { text: img.caption ?? "[Imagem]", mediaUrl: img.url ?? null };
  }
  if (message.audioMessage) {
    const audio = message.audioMessage as { url?: string };
    return { text: "[Áudio]", mediaUrl: audio.url ?? null };
  }
  if (message.videoMessage) {
    const video = message.videoMessage as { caption?: string; url?: string };
    return { text: video.caption ?? "[Vídeo]", mediaUrl: video.url ?? null };
  }
  return { text: "[Mensagem]", mediaUrl: null };
}

function extractMessageType(msg: Record<string, unknown>): string {
  const message = (msg.message ?? msg) as Record<string, unknown>;
  if (message.audioMessage) return "audio";
  if (message.videoMessage) return "video";
  if (message.imageMessage) return "image";
  if (message.documentMessage) return "document";
  return "text";
}
