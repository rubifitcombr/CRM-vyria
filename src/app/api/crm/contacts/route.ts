import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");
  const stage = searchParams.get("stage");
  const funnel = searchParams.get("funnel");
  const q = searchParams.get("q");

  const supabase = createAdminClient();
  let query = supabase.from("contacts").select(`
    *,
    contact_tags(tag_id, tags(id, name, color)),
    contact_pipeline(stage_id, funnel_id, pipeline_stages(id, name, color)),
    conversations(id, funnel_id, status, funnels(name))
  `);

  if (q) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data, error: dbError } = await query.order("last_seen_at", {
    ascending: false,
    nullsFirst: false,
  });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  let filtered = data ?? [];

  if (tag) {
    filtered = filtered.filter((c) =>
      (c.contact_tags as { tag_id: string }[])?.some((t) => t.tag_id === tag)
    );
  }
  if (stage) {
    filtered = filtered.filter(
      (c) =>
        (c.contact_pipeline as { stage_id: string } | null)?.stage_id === stage
    );
  }
  if (funnel) {
    filtered = filtered.filter((c) =>
      (c.conversations as { funnel_id: string; status: string }[])?.some(
        (conv) => conv.funnel_id === funnel && conv.status === "active"
      )
    );
  }

  return NextResponse.json({ contacts: filtered });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const phone = normalizePhone(body.phone ?? "");
  if (!phone) {
    return NextResponse.json({ error: "Phone required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error: dbError } = await supabase
    .from("contacts")
    .insert({
      phone,
      name: body.name ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  if (body.stage_id) {
    await supabase.from("contact_pipeline").upsert({
      contact_id: data.id,
      stage_id: body.stage_id,
    });
  }

  if (body.tag_ids?.length) {
    await supabase.from("contact_tags").insert(
      body.tag_ids.map((tagId: string) => ({
        contact_id: data.id,
        tag_id: tagId,
      }))
    );
  }

  return NextResponse.json({ contact: data });
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error: dbError } = await supabase
    .from("contacts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ contact: data });
}
