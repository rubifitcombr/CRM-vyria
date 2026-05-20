import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") ?? "all";
  const q = searchParams.get("q");

  const supabase = createAdminClient();

  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select(`
      *,
      contacts(*),
      funnels(id, name, active),
      funnel_nodes:current_node_id(id, type, label, config)
    `)
    .order("updated_at", { ascending: false });

  if (conversationsError) {
    return NextResponse.json({ error: conversationsError.message }, { status: 500 });
  }

  const enriched = await Promise.all(
    (conversations ?? []).map(async (conv) => {
      const contact = conv.contacts;
      if (!contact) return null;

      const { data: lastMsg } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: tags } = await supabase
        .from("contact_tags")
        .select("tags(*)")
        .eq("contact_id", contact.id);

      const { data: pipeline } = await supabase
        .from("contact_pipeline")
        .select("*, pipeline_stages(*)")
        .eq("contact_id", contact.id)
        .maybeSingle();

      const { count: unread } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .eq("direction", "inbound")
        .is("read_at", null);

      return {
        ...conv,
        contact,
        last_message: lastMsg,
        tags: tags?.map((t) => t.tags) ?? [],
        stage: pipeline?.pipeline_stages ?? null,
        unread_count: unread ?? 0,
      };
    })
  );

  let filtered = enriched.filter(Boolean);

  if (filter === "unread") {
    filtered = filtered.filter((c) => (c.unread_count ?? 0) > 0);
  } else if (filter === "waiting") {
    filtered = filtered.filter((c) => c.status === "waiting");
  } else if (filter === "funnel") {
    filtered = filtered.filter((c) => c.funnel_id);
  }

  if (q) {
    const lower = q.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.contact?.name?.toLowerCase().includes(lower) ||
        c.contact?.phone?.includes(q)
    );
  }

  const uniqueByContact = new Map();
  for (const c of filtered) {
    if (!uniqueByContact.has(c.contact_id)) {
      uniqueByContact.set(c.contact_id, c);
    }
  }

  return NextResponse.json({
    conversations: Array.from(uniqueByContact.values()),
  });
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const supabase = createAdminClient();

  const { data, error: dbError } = await supabase
    .from("conversations")
    .update(body)
    .eq("id", body.id)
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ conversation: data });
}
