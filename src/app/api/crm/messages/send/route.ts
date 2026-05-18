import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { evolutionApi } from "@/lib/crm/evolution-api";
import { renderVariables } from "@/lib/crm/variables";

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { contact_id, type, content, media_url } = body;

  if (!contact_id || !type) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contact_id)
    .single();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  let { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("contact_id", contact_id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({ contact_id, status: "active" })
      .select()
      .single();
    conversation = newConv;
  }

  const text = renderVariables(content ?? "", contact);

  try {
    if (type === "text") {
      await evolutionApi.sendText(contact.phone, text);
    } else if (type === "audio" && media_url) {
      await evolutionApi.sendAudio(contact.phone, media_url);
    } else if (type === "video" && media_url) {
      await evolutionApi.sendVideo(contact.phone, media_url, text);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { data: message } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversation!.id,
      contact_id,
      direction: "outbound",
      type,
      content: text,
      media_url: media_url ?? null,
      status: "sent",
      sent_by: "manual",
    })
    .select()
    .single();

  await supabase
    .from("contacts")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", contact_id);

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation!.id);

  return NextResponse.json({ message });
}
