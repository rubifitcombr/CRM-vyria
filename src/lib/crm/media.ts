import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadCrmMedia(
  phone: string,
  file: Buffer,
  ext: string,
  contentType: string
): Promise<string> {
  const supabase = createAdminClient();
  const path = `${phone.replace(/\D/g, "")}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("crm-media")
    .upload(path, file, { contentType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from("crm-media").getPublicUrl(path);
  return data.publicUrl;
}
