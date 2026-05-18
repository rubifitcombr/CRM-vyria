import { CRM_EVOLUTION_INSTANCE, isCrmEvolutionInstance } from "@/lib/crm/evolution-constants";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CrmSettings } from "@/types/crm";

export type { CrmSettings };

const SETTINGS_KEY = "global";

export async function getCrmSettings(): Promise<CrmSettings> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("crm_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();

  const db = (data?.value as CrmSettings) ?? {};
  return {
    evolution_base_url:
      db.evolution_base_url ?? process.env.EVOLUTION_API_BASE_URL ?? "",
    evolution_api_key:
      db.evolution_api_key ?? process.env.EVOLUTION_API_KEY ?? "",
    evolution_instance: (() => {
      const fromDb = db.evolution_instance ?? "";
      const fromEnv = process.env.EVOLUTION_INSTANCE ?? "";
      if (isCrmEvolutionInstance(fromDb)) return fromDb;
      if (isCrmEvolutionInstance(fromEnv)) return fromEnv;
      return CRM_EVOLUTION_INSTANCE;
    })(),
    attendant_name: db.attendant_name ?? "Atendente",
    test_phone: db.test_phone ?? "",
    default_typing: db.default_typing ?? true,
    default_delay: db.default_delay ?? 3,
  };
}

export async function saveCrmSettings(settings: CrmSettings): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("crm_settings").upsert({
    key: SETTINGS_KEY,
    value: settings,
    updated_at: new Date().toISOString(),
  });
}
