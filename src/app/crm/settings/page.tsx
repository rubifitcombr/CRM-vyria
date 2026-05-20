"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  QrCode,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { CrmSettings } from "@/types/crm";

const CRM_INSTANCE = "vyria_crm";

type EvolutionInstance = {
  id: string;
  name: string;
  connectionStatus: string;
  profileName: string | null;
  ownerJid: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  open: "Conectado",
  close: "Desconectado",
  connecting: "Conectando...",
};

const STATUS_COLOR: Record<string, string> = {
  open: "text-green-400",
  close: "text-red-400",
  connecting: "text-yellow-400",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<CrmSettings>({});
  const [crmInstance, setCrmInstance] = useState<EvolutionInstance | null>(null);
  const [hasDedicated, setHasDedicated] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [status, setStatus] = useState<{
    connected: boolean;
    state?: string;
    error?: string;
  } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingConnect, setLoadingConnect] = useState(false);
  const [loadingWebhook, setLoadingWebhook] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchCrmStatus = useCallback(async (s: CrmSettings) => {
    if (!s.evolution_base_url || !s.evolution_api_key) return;

    setLoadingCheck(true);
    try {
      const res = await fetch("/api/crm/whatsapp/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evolution_base_url: s.evolution_base_url,
          evolution_api_key: s.evolution_api_key,
          evolution_instance: CRM_INSTANCE,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setHasDedicated(data.has_dedicated ?? false);
      setCrmInstance(data.dedicated ?? null);
      if (data.has_dedicated) {
        setSettings((prev) => ({
          ...prev,
          evolution_instance: CRM_INSTANCE,
        }));
      }
    } catch {
      setHasDedicated(false);
      setCrmInstance(null);
    } finally {
      setLoadingCheck(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/crm/settings")
      .then((r) => r.json())
      .then((d) => {
        const s = {
          ...(d.settings ?? {}),
          evolution_instance: CRM_INSTANCE,
        };
        setSettings(s);
        if (s.evolution_base_url && s.evolution_api_key) {
          fetchCrmStatus(s);
        }
      });
    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/crm/webhooks/whatsapp`);
    }
  }, [fetchCrmStatus]);

  const creds = useCallback(
    () => ({
      evolution_base_url: settings.evolution_base_url,
      evolution_api_key: settings.evolution_api_key,
      evolution_instance: CRM_INSTANCE,
    }),
    [settings]
  );

  async function createCrmInstance() {
    setLoadingCreate(true);
    setMessage(null);
    try {
      const res = await fetch("/api/crm/whatsapp/instance/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evolution_base_url: settings.evolution_base_url,
          evolution_api_key: settings.evolution_api_key,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSettings((prev) => ({
        ...prev,
        evolution_instance: CRM_INSTANCE,
      }));
      setHasDedicated(true);
      setCrmInstance(data.instance ?? null);
      setMessage(data.message ?? "Instância Vyria CRM criada.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao criar instância");
    } finally {
      setLoadingCreate(false);
    }
  }

  async function testConnection() {
    setLoadingStatus(true);
    setMessage(null);
    setQr(null);
    try {
      const res = await fetch("/api/crm/whatsapp/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...creds(), save: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus(data);
      if (data.connected) {
        setMessage("WhatsApp conectado com sucesso!");
      } else {
        setMessage(
          `Status: ${STATUS_LABEL[data.state] ?? data.state}. Use "Gerar QR Code" para conectar.`
        );
      }
    } catch (e) {
      setStatus({ connected: false, error: e instanceof Error ? e.message : "Erro" });
      setMessage(e instanceof Error ? e.message : "Erro ao testar conexão");
    } finally {
      setLoadingStatus(false);
    }
  }

  async function connectWhatsApp() {
    setLoadingConnect(true);
    setMessage(null);
    try {
      const res = await fetch("/api/crm/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...creds(), save: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.connected) {
        setStatus({ connected: true, state: data.state });
        setQr(null);
        setMessage("WhatsApp já está conectado!");
      } else {
        setStatus({ connected: false, state: data.state });
        setQr(data.qr ?? null);
        setMessage("Escaneie o QR Code com o WhatsApp no celular.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao conectar");
    } finally {
      setLoadingConnect(false);
    }
  }

  async function configureWebhook() {
    setLoadingWebhook(true);
    setMessage(null);
    try {
      const res = await fetch("/api/crm/whatsapp/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...creds(), webhook_url: webhookUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage("Webhook configurado na instância vyria_crm!");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao configurar webhook");
    } finally {
      setLoadingWebhook(false);
    }
  }

  async function save() {
    setSaving(true);
    await fetch("/api/crm/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, evolution_instance: CRM_INSTANCE }),
    });
    setSaving(false);
    setMessage("Configurações salvas.");
  }

  const canUseCrm =
    hasDedicated && settings.evolution_base_url && settings.evolution_api_key;

  return (
    <div className="mx-auto w-full max-w-2xl p-6 pb-32">
      <h1 className="mb-2 text-2xl font-bold text-white">Configurações</h1>
      <p className="mb-6 text-sm text-gray-500">
        Instância WhatsApp exclusiva do Vyria CRM — isolada do Delivery (
        <code className="text-gray-400">store_*</code>).
      </p>

      {message && (
        <div className="mb-4 rounded-lg border border-[#E8521A]/30 bg-[#E8521A]/10 px-4 py-3 text-sm text-[#E8521A]">
          {message}
        </div>
      )}

      <section className="mb-6 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
          <Wifi size={18} className="text-[#E8521A]" />
          Evolution API
        </h2>

        <div className="space-y-4">
          <Field
            label="URL base"
            value={settings.evolution_base_url ?? ""}
            onChange={(v) => setSettings({ ...settings, evolution_base_url: v })}
            placeholder="http://185.225.233.14"
          />
          <Field
            label="API Key"
            value={settings.evolution_api_key ?? ""}
            onChange={(v) => setSettings({ ...settings, evolution_api_key: v })}
            type="password"
          />

          <div className="rounded-lg border border-[#2e2e2e] bg-[#252525] p-4">
            <p className="mb-1 text-sm font-medium text-white">Instância Vyria CRM</p>
            <p className="mb-3 text-xs text-gray-500">
              Nome fixo: <code className="text-[#E8521A]">{CRM_INSTANCE}</code>
            </p>

            {!hasDedicated ? (
              <button
                onClick={createCrmInstance}
                disabled={
                  loadingCreate ||
                  !settings.evolution_base_url ||
                  !settings.evolution_api_key
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E8521A] py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {loadingCreate ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Criar instância Vyria CRM
              </button>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status</span>
                  <span
                    className={
                      crmInstance?.connectionStatus === "open"
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {STATUS_LABEL[crmInstance?.connectionStatus ?? ""] ??
                      crmInstance?.connectionStatus ??
                      "—"}
                  </span>
                </div>
                {crmInstance?.profileName && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Perfil</span>
                    <span className="text-white">{crmInstance.profileName}</span>
                  </div>
                )}
                {crmInstance?.ownerJid && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Número</span>
                    <span className="text-white">
                      {crmInstance.ownerJid.split("@")[0]}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => fetchCrmStatus(settings)}
                  disabled={loadingCheck}
                  className="mt-2 text-xs text-[#E8521A] hover:underline"
                >
                  {loadingCheck ? "Atualizando..." : "Atualizar status"}
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={testConnection}
              disabled={loadingStatus || !canUseCrm}
              className="flex items-center gap-2 rounded-lg bg-[#252525] px-4 py-2 text-sm text-white hover:bg-[#333] disabled:opacity-50"
            >
              {loadingStatus ? (
                <Loader2 size={16} className="animate-spin" />
              ) : status?.connected ? (
                <Wifi size={16} className="text-green-400" />
              ) : (
                <WifiOff size={16} />
              )}
              Testar conexão
            </button>
            <button
              onClick={connectWhatsApp}
              disabled={loadingConnect || !canUseCrm}
              className="flex items-center gap-2 rounded-lg bg-[#E8521A] px-4 py-2 text-sm text-white hover:bg-[#c44516] disabled:opacity-50"
            >
              {loadingConnect ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <QrCode size={16} />
              )}
              Gerar QR Code
            </button>
          </div>

          {status && (
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                status.connected
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {status.connected ? <CheckCircle2 size={16} /> : <WifiOff size={16} />}
              <span>
                {status.connected
                  ? "Conectado"
                  : STATUS_LABEL[status.state ?? ""] ?? status.state ?? "Desconectado"}
              </span>
            </div>
          )}

          {qr && (
            <div className="rounded-xl border border-[#2e2e2e] bg-[#252525] p-4 text-center">
              <p className="mb-3 text-sm text-gray-400">
                WhatsApp → Aparelhos conectados → Conectar aparelho
              </p>
              <img
                src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`}
                alt="QR Code"
                className="mx-auto max-w-[280px] rounded-lg"
              />
              <button
                onClick={connectWhatsApp}
                disabled={loadingConnect}
                className="mt-3 text-xs text-[#E8521A] hover:underline"
              >
                Atualizar QR Code
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] p-6">
        <h2 className="mb-4 font-semibold text-white">Webhook de entrada</h2>
        <code className="mb-3 block break-all rounded-lg bg-[#252525] p-3 text-xs text-[#E8521A]">
          {webhookUrl}
        </code>
        <p className="mb-3 text-xs text-gray-500">
          Header: <code>x-webhook-secret: vyria-crm-2026</code>
        </p>
        {webhookUrl.startsWith("http://localhost") && (
          <p className="mb-3 rounded-lg bg-yellow-500/10 p-3 text-xs text-yellow-400">
            Em local, use ngrok ou deploy na Vercel para receber mensagens.
          </p>
        )}
        <button
          onClick={configureWebhook}
          disabled={loadingWebhook || !canUseCrm}
          className="rounded-lg bg-[#252525] px-4 py-2 text-sm text-white hover:bg-[#333] disabled:opacity-50"
        >
          {loadingWebhook ? "Configurando..." : "Configurar webhook na Evolution"}
        </button>
      </section>

      <section className="mb-6 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] p-6">
        <h2 className="mb-4 font-semibold text-white">Geral</h2>
        <div className="space-y-3">
          <Field
            label="Nome do atendente"
            value={settings.attendant_name ?? ""}
            onChange={(v) => setSettings({ ...settings, attendant_name: v })}
          />
          <Field
            label="Número de teste"
            value={settings.test_phone ?? ""}
            onChange={(v) => setSettings({ ...settings, test_phone: v })}
            placeholder="5562999999999"
          />
        </div>
      </section>

      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-[#E8521A] px-6 py-2.5 text-white disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar configurações"}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs text-gray-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#2e2e2e] bg-[#252525] px-3 py-2 text-white"
      />
    </div>
  );
}
