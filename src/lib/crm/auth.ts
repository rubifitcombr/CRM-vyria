import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { user, error: null };
}

export async function requireCronAuth(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const { user, error } = await requireAuth();
  if (error) return false;
  return !!user;
}
