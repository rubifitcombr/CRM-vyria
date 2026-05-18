import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { contact_id, stage_id, funnel_id } = await request.json();

  if (!contact_id || !stage_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error: dbError } = await supabase.from("contact_pipeline").upsert({
    contact_id,
    stage_id,
    funnel_id: funnel_id ?? null,
    moved_at: new Date().toISOString(),
  });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("contact_id", contact_id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (conv) {
    await supabase.from("funnel_logs").insert({
      conversation_id: conv.id,
      action: "pipeline_move",
      result: `Moved to stage ${stage_id}`,
    });
  }

  return NextResponse.json({ ok: true });
}
