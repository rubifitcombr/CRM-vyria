import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversation_id");

  if (!conversationId) {
    return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error: dbError } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .is("read_at", null);

  return NextResponse.json({ messages: data });
}
