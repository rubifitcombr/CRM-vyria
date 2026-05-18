import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id: contactId } = await params;
  const { tag_id } = await request.json();

  const supabase = createAdminClient();
  const { error: dbError } = await supabase
    .from("contact_tags")
    .upsert({ contact_id: contactId, tag_id });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id: contactId } = await params;
  const { searchParams } = new URL(request.url);
  const tagId = searchParams.get("tag_id");

  if (!tagId) {
    return NextResponse.json({ error: "tag_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  await supabase
    .from("contact_tags")
    .delete()
    .eq("contact_id", contactId)
    .eq("tag_id", tagId);

  return NextResponse.json({ ok: true });
}
