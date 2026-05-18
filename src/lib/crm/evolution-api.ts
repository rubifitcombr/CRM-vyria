import { CRM_EVOLUTION_INSTANCE, isCrmEvolutionInstance } from "@/lib/crm/evolution-constants";
import { getCrmSettings, type CrmSettings } from "@/lib/crm/settings";

export { CRM_EVOLUTION_INSTANCE, isCrmEvolutionInstance };

export type EvolutionInstance = {
  id: string;
  name: string;
  connectionStatus: string;
  profileName: string | null;
  ownerJid: string | null;
};

type EvolutionConfig = {
  baseUrl: string;
  apiKey: string;
  instance: string;
};

async function resolveConfig(overrides?: Partial<CrmSettings>): Promise<EvolutionConfig> {
  const s = overrides ? { ...(await getCrmSettings()), ...overrides } : await getCrmSettings();
  return {
    baseUrl: (s.evolution_base_url ?? "").replace(/\/$/, ""),
    apiKey: s.evolution_api_key ?? "",
    instance: s.evolution_instance ?? "",
  };
}

async function evolutionRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
  overrides?: Partial<CrmSettings>
): Promise<T> {
  const { baseUrl, apiKey, instance } = await resolveConfig(overrides);

  if (!baseUrl || !apiKey) {
    throw new Error("Configure URL base e API Key da Evolution API");
  }

  const publicPaths = ["/fetchInstances", "/instance/create"];
  const isPublic = publicPaths.some((p) => path.includes(p));

  if (!isPublic && !instance && !path.includes("{instance}")) {
    throw new Error("Instância Vyria CRM não configurada. Crie a instância em Configurações.");
  }

  const url = path.includes("{instance}")
    ? `${baseUrl}${path.replace("{instance}", encodeURIComponent(instance))}`
    : isPublic
      ? `${baseUrl}${path}`
      : `${baseUrl}${path}/${encodeURIComponent(instance)}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
      ...options.headers,
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null
        ? JSON.stringify(data)
        : String(data);
    throw new Error(`Evolution API (${res.status}): ${msg.slice(0, 300)}`);
  }

  return data as T;
}

export function parseConnectionState(data: unknown): {
  connected: boolean;
  state: string;
} {
  const d = data as Record<string, unknown>;
  const instance = d.instance as Record<string, unknown> | undefined;
  const state =
    (instance?.state as string) ??
    (d.state as string) ??
    (d.connectionStatus as string) ??
    (instance?.connectionStatus as string) ??
    "unknown";

  const connected =
    state === "open" ||
    state === "connected" ||
    state === "OPEN";

  return { connected, state };
}

export function parseQrCode(data: unknown): string | null {
  const d = data as Record<string, unknown>;
  if (typeof d.base64 === "string" && d.base64) return d.base64;
  const qrcode = d.qrcode as Record<string, unknown> | undefined;
  if (typeof qrcode?.base64 === "string") return qrcode.base64;
  return null;
}

export const evolutionApi = {
  /** Apenas instâncias do Vyria CRM — nunca as do Delivery (store_*). */
  async listCrmInstances(overrides?: Partial<CrmSettings>): Promise<EvolutionInstance[]> {
    const data = await evolutionRequest<EvolutionInstance[] | { value?: EvolutionInstance[] }>(
      "/instance/fetchInstances",
      { method: "GET" },
      overrides
    );
    const all = Array.isArray(data) ? data : (data?.value ?? []);
    return all.filter((i) => isCrmEvolutionInstance(i.name));
  },

  async ensureCrmInstance(overrides?: Partial<CrmSettings>): Promise<string> {
    try {
      await evolutionRequest(
        "/instance/create",
        {
          method: "POST",
          body: JSON.stringify({
            instanceName: CRM_EVOLUTION_INSTANCE,
            qrcode: false,
            integration: "WHATSAPP-BAILEYS",
          }),
        },
        { ...overrides, evolution_instance: CRM_EVOLUTION_INSTANCE }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (!msg.toLowerCase().includes("already in use") && !msg.includes("409")) {
        throw e;
      }
    }

    return CRM_EVOLUTION_INSTANCE;
  },

  async getCrmInstance(overrides?: Partial<CrmSettings>): Promise<EvolutionInstance | null> {
    const list = await this.listCrmInstances(overrides);
    return list.find((i) => i.name === CRM_EVOLUTION_INSTANCE) ?? list[0] ?? null;
  },

  async getStatus(overrides?: Partial<CrmSettings>) {
    const data = await evolutionRequest(
      "/instance/connectionState/{instance}",
      { method: "GET" },
      overrides
    );
    return { ...parseConnectionState(data), raw: data };
  },

  async connect(overrides?: Partial<CrmSettings>) {
    const data = await evolutionRequest(
      "/instance/connect/{instance}",
      { method: "GET" },
      overrides
    );
    return { qr: parseQrCode(data), raw: data };
  },

  async restart(overrides?: Partial<CrmSettings>) {
    return evolutionRequest(
      "/instance/restart/{instance}",
      { method: "POST" },
      overrides
    );
  },

  async setWebhook(webhookUrl: string, overrides?: Partial<CrmSettings>) {
    return evolutionRequest(
      "/webhook/set/{instance}",
      {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            headers: {
              "x-webhook-secret": process.env.CRM_WEBHOOK_SECRET ?? "vyria-crm-2026",
            },
            byEvents: false,
            base64: false,
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
          },
        }),
      },
      overrides
    );
  },

  async sendText(phone: string, text: string) {
    return evolutionRequest("/message/sendText", {
      method: "POST",
      body: JSON.stringify({ number: phone, text }),
    });
  },

  async sendAudio(phone: string, audioUrl: string) {
    return evolutionRequest("/message/sendMedia", {
      method: "POST",
      body: JSON.stringify({
        number: phone,
        mediatype: "audio",
        media: audioUrl,
      }),
    });
  },

  async sendVideo(phone: string, videoUrl: string, caption?: string) {
    return evolutionRequest("/message/sendMedia", {
      method: "POST",
      body: JSON.stringify({
        number: phone,
        mediatype: "video",
        media: videoUrl,
        caption,
      }),
    });
  },

  async sendTyping(phone: string, durationSeconds: number) {
    return evolutionRequest("/chat/sendPresence", {
      method: "POST",
      body: JSON.stringify({
        number: phone,
        presence: "composing",
        delay: durationSeconds * 1000,
      }),
    });
  },
};
