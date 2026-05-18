import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: funnel }, { data: nodes }, { data: edges }] = await Promise.all([
    supabase.from("funnels").select("*").eq("id", id).single(),
    supabase.from("funnel_nodes").select("*").eq("funnel_id", id),
    supabase.from("funnel_edges").select("*").eq("funnel_id", id),
  ]);

  if (!funnel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ funnel, nodes, edges });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  if (body.funnel) {
    await supabase.from("funnels").update(body.funnel).eq("id", id);
  }

  if (body.nodes) {
    for (const node of body.nodes) {
      await supabase.from("funnel_nodes").upsert({
        id: node.id,
        funnel_id: id,
        type: node.type,
        label: node.label,
        config: node.config,
        position_x: node.position_x,
        position_y: node.position_y,
      });
    }
  }

  if (body.deleted_node_ids?.length) {
    await supabase
      .from("funnel_nodes")
      .delete()
      .in("id", body.deleted_node_ids);
  }

  if (body.edges) {
    await supabase.from("funnel_edges").delete().eq("funnel_id", id);
    if (body.edges.length) {
      await supabase.from("funnel_edges").insert(
        body.edges.map(
          (e: {
            source_node_id: string;
            target_node_id: string;
            condition_label?: string;
            condition_value?: string;
          }) => ({
            funnel_id: id,
            source_node_id: e.source_node_id,
            target_node_id: e.target_node_id,
            condition_label: e.condition_label ?? null,
            condition_value: e.condition_value ?? null,
          })
        )
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const supabase = createAdminClient();
  await supabase.from("funnels").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
