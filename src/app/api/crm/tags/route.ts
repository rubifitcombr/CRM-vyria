import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const supabase = createAdminClient();
  const { data: tags } = await supabase.from("tags").select("*").order("name");

  const tagsWithCount = await Promise.all(
    (tags ?? []).map(async (tag) => {
      const { count } = await supabase
        .from("contact_tags")
        .select("*", { count: "exact", head: true })
        .eq("tag_id", tag.id);
      return { ...tag, contact_count: count ?? 0 };
    })
  );

  return NextResponse.json({ tags: tagsWithCount });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const supabase = createAdminClient();
  const { data, error: dbError } = await supabase
    .from("tags")
    .insert({ name: body.name, color: body.color ?? "#E8521A" })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ tag: data });
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const supabase = createAdminClient();
  const { data, error: dbError } = await supabase
    .from("tags")
    .update({ name: body.name, color: body.color })
    .eq("id", body.id)
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ tag: data });
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  await supabase.from("tags").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
