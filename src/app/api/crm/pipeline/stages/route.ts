import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("pipeline_stages")
    .select("*")
    .order("sort_order");

  return NextResponse.json({ stages: data });
}
