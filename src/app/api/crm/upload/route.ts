import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/crm/auth";
import { uploadCrmMedia } from "@/lib/crm/media";

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const phone = (formData.get("phone") as string) ?? "unknown";

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  if (file.size > 16 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 16MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const url = await uploadCrmMedia(phone, buffer, ext, file.type);
    return NextResponse.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
