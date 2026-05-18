import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const supabase = createAdminClient();
  const { data, error: dbError } = await supabase
    .from("funnels")
    .select("*")
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ funnels: data });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const supabase = createAdminClient();

  const { data: funnel, error: funnelError } = await supabase
    .from("funnels")
    .insert({
      name: body.name ?? "Novo funil",
      description: body.description ?? null,
      trigger_keyword: body.trigger_keyword ?? null,
      trigger_type: body.trigger_type ?? "keyword",
    })
    .select()
    .single();

  if (funnelError) {
    return NextResponse.json({ error: funnelError.message }, { status: 500 });
  }

  const { data: triggerNode } = await supabase
    .from("funnel_nodes")
    .insert({
      funnel_id: funnel.id,
      type: "trigger",
      label: "Trigger",
      config: { triggerType: "keyword", keyword: "" },
      position_x: 250,
      position_y: 50,
    })
    .select()
    .single();

  await supabase.from("funnel_nodes").insert({
    funnel_id: funnel.id,
    type: "end",
    label: "Fim",
    config: {},
    position_x: 250,
    position_y: 400,
  });

  if (triggerNode) {
    const { data: endNode } = await supabase
      .from("funnel_nodes")
      .select("id")
      .eq("funnel_id", funnel.id)
      .eq("type", "end")
      .single();

    if (endNode) {
      await supabase.from("funnel_edges").insert({
        funnel_id: funnel.id,
        source_node_id: triggerNode.id,
        target_node_id: endNode.id,
      });
    }
  }

  return NextResponse.json({ funnel });
}
