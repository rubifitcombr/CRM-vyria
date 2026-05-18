"use client";

import { useEffect, useState } from "react";
import { VARIABLE_BUTTONS, renderVariables } from "@/lib/crm/variables";
import type { FunnelNodeData } from "@/components/crm/funnel/custom-node";
import type { Node } from "reactflow";

export function NodeConfigPanel({
  node,
  onChange,
  onClose,
}: {
  node: Node<FunnelNodeData>;
  onChange: (config: Record<string, unknown>, label?: string) => void;
  onClose: () => void;
}) {
  const [config, setConfig] = useState(node.data.config);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    setConfig(node.data.config);
  }, [node.id, node.data.config]);

  useEffect(() => {
    fetch("/api/crm/tags").then((r) => r.json()).then((d) => setTags(d.tags ?? []));
    fetch("/api/crm/pipeline/stages").then((r) => r.json()).then((d) => setStages(d.stages ?? []));
  }, []);

  function update(partial: Record<string, unknown>) {
    const next = { ...config, ...partial };
    setConfig(next);
    onChange(next, node.data.label);
  }

  const type = node.data.nodeType;

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-[#2e2e2e] bg-[#1a1a1a] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium text-white">Configurar nó</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white">×</button>
      </div>

      <div className="mb-4">
        <span className="mb-1 block text-xs text-gray-500">Label</span>
        <input
          value={node.data.label}
          onChange={(e) => onChange(config, e.target.value)}
          className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
        />
      </div>

      {type === "trigger" && (
        <TriggerConfig config={config} update={update} />
      )}
      {type === "message" && (
        <MessageConfig config={config} update={update} />
      )}
      {type === "wait" && <WaitConfig config={config} update={update} />}
      {type === "condition" && (
        <ConditionConfig config={config} update={update} tags={tags} stages={stages} />
      )}
      {type === "tag" && (
        <TagConfig config={config} update={update} tags={tags} />
      )}
      {type === "move_stage" && (
        <StageConfig config={config} update={update} stages={stages} />
      )}
      {type === "webhook" && (
        <WebhookConfig config={config} update={update} />
      )}
      {type === "end" && (
        <p className="text-xs text-gray-500">Este nó encerra o fluxo.</p>
      )}
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <span className="mb-1 block text-xs text-gray-500">{label}</span>
      {children}
    </div>
  );
}

function TriggerConfig({
  config,
  update,
}: {
  config: Record<string, unknown>;
  update: (p: Record<string, unknown>) => void;
}) {
  return (
    <>
      <Field label="Tipo">
        <select
          value={(config.triggerType as string) ?? "keyword"}
          onChange={(e) => update({ triggerType: e.target.value })}
          className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
        >
          <option value="keyword">Palavra-chave</option>
          <option value="new_contact">Novo contato</option>
          <option value="tag">Tag adicionada</option>
          <option value="manual">Manual</option>
        </select>
      </Field>
      {(config.triggerType === "keyword" || !config.triggerType) && (
        <Field label="Palavra-chave">
          <input
            value={(config.keyword as string) ?? ""}
            onChange={(e) => update({ keyword: e.target.value })}
            placeholder="QUERO"
            className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
          />
        </Field>
      )}
    </>
  );
}

function MessageConfig({
  config,
  update,
}: {
  config: Record<string, unknown>;
  update: (p: Record<string, unknown>) => void;
}) {
  const msgType = (config.messageType as string) ?? "text";
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("phone", "funnel");
      const res = await fetch("/api/crm/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha no upload");
      update({ media_url: data.url, file_name: file.name });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  const needsMedia = ["audio", "video", "image", "document"].includes(msgType);

  return (
    <>
      <Field label="Tipo de mensagem">
        <select
          value={msgType}
          onChange={(e) => update({ messageType: e.target.value })}
          className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
        >
          <option value="text">Texto</option>
          <option value="image">Imagem</option>
          <option value="audio">Áudio</option>
          <option value="video">Vídeo</option>
          <option value="link">Link</option>
          <option value="document">Arquivo</option>
        </select>
      </Field>

      <label className="mb-3 flex items-start gap-2 rounded-lg border border-[#E8521A]/30 bg-[#E8521A]/10 p-2.5 text-xs text-gray-300">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={config.waitForReply !== false}
          onChange={(e) => update({ waitForReply: e.target.checked })}
        />
        <span>
          <strong className="text-white">Aguardar resposta</strong> antes da próxima
          mensagem
        </span>
      </label>
      {msgType === "text" && (
        <>
          <div className="mb-2 flex flex-wrap gap-1">
            {VARIABLE_BUTTONS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() =>
                  update({ text: ((config.text as string) ?? "") + v.key })
                }
                className="rounded bg-[#252525] px-2 py-0.5 text-[10px] text-gray-400"
              >
                {v.label}
              </button>
            ))}
          </div>
          <Field label="Mensagem">
            <textarea
              value={(config.text as string) ?? ""}
              onChange={(e) => update({ text: e.target.value })}
              rows={4}
              className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
            />
          </Field>
          <p className="mb-3 text-[10px] text-gray-500">
            Preview: {renderVariables((config.text as string) ?? "", { name: "João Silva", phone: "5562999999999" })}
          </p>
        </>
      )}
      {msgType === "link" && (
        <>
          <Field label="Texto (opcional)">
            <input
              value={(config.text as string) ?? ""}
              onChange={(e) => update({ text: e.target.value })}
              placeholder="Confira nosso plano:"
              className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
            />
          </Field>
          <Field label="URL do link">
            <input
              value={(config.link_url as string) ?? ""}
              onChange={(e) => update({ link_url: e.target.value })}
              placeholder="https://..."
              className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
            />
          </Field>
        </>
      )}

      {needsMedia && (
        <>
          <Field label="Arquivo ou URL">
            <input
              type="file"
              accept={
                msgType === "image"
                  ? "image/*"
                  : msgType === "audio"
                    ? "audio/*"
                    : msgType === "video"
                      ? "video/*"
                      : "*/*"
              }
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
              className="w-full text-xs text-gray-400"
            />
          </Field>
          <Field label="URL da mídia">
            <input
              value={(config.media_url as string) ?? ""}
              onChange={(e) => update({ media_url: e.target.value })}
              placeholder="https://... (Supabase ou link público)"
              className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
            />
          </Field>
          {(msgType === "image" || msgType === "video" || msgType === "document") && (
            <Field label={msgType === "document" ? "Nome do arquivo" : "Legenda (opcional)"}>
              <input
                value={
                  msgType === "document"
                    ? ((config.file_name as string) ?? "")
                    : ((config.text as string) ?? "")
                }
                onChange={(e) =>
                  update(
                    msgType === "document"
                      ? { file_name: e.target.value }
                      : { text: e.target.value }
                  )
                }
                className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
              />
            </Field>
          )}
        </>
      )}
      <Field label="Delay antes de enviar">
        <select
          value={String(config.delay ?? 0)}
          onChange={(e) => update({ delay: Number(e.target.value) })}
          className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
        >
          {[0, 3, 5, 10, 30, 60, 120].map((s) => (
            <option key={s} value={s}>
              {s === 0 ? "0s" : s < 60 ? `${s}s` : `${s / 60}min`}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-2 text-xs text-gray-400">
        <input
          type="checkbox"
          checked={Boolean(config.typing)}
          onChange={(e) => update({ typing: e.target.checked })}
        />
        Indicador de digitação
      </label>
    </>
  );
}

function WaitConfig({
  config,
  update,
}: {
  config: Record<string, unknown>;
  update: (p: Record<string, unknown>) => void;
}) {
  return (
    <>
      <Field label="Tipo">
        <select
          value={(config.waitType as string) ?? "fixed"}
          onChange={(e) => update({ waitType: e.target.value })}
          className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
        >
          <option value="fixed">Tempo fixo</option>
          <option value="response">Aguardar resposta</option>
        </select>
      </Field>
      {(config.waitType as string) === "response" && (
        <p className="mb-3 text-[10px] text-gray-500">
          O funil só continua depois que o lead enviar qualquer mensagem (texto, áudio,
          imagem, etc.).
        </p>
      )}
      {(config.waitType ?? "fixed") === "fixed" && (
        <div className="flex gap-2">
          <input
            type="number"
            value={Number(config.amount ?? 1)}
            onChange={(e) => update({ amount: Number(e.target.value) })}
            className="w-20 rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
          />
          <select
            value={(config.unit as string) ?? "minutes"}
            onChange={(e) => update({ unit: e.target.value })}
            className="flex-1 rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
          >
            <option value="minutes">Minutos</option>
            <option value="hours">Horas</option>
            <option value="days">Dias</option>
          </select>
        </div>
      )}
    </>
  );
}

function ConditionConfig({
  config,
  update,
  tags,
  stages,
}: {
  config: Record<string, unknown>;
  update: (p: Record<string, unknown>) => void;
  tags: { id: string; name: string }[];
  stages: { id: string; name: string }[];
}) {
  const cond = (config.condition as string) ?? "has_response";
  return (
    <>
      <Field label="Condição">
        <select
          value={cond}
          onChange={(e) => update({ condition: e.target.value })}
          className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
        >
          <option value="has_response">Lead respondeu</option>
          <option value="has_tag">Lead tem tag</option>
          <option value="in_stage">Lead está na etapa</option>
          <option value="contains_word">Resposta contém palavra</option>
        </select>
      </Field>
      {cond === "has_tag" && (
        <Field label="Tag">
          <select
            value={(config.tag_id as string) ?? ""}
            onChange={(e) => update({ tag_id: e.target.value })}
            className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
          >
            <option value="">Selecionar</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>
      )}
      {cond === "in_stage" && (
        <Field label="Etapa">
          <select
            value={(config.stage_id as string) ?? ""}
            onChange={(e) => update({ stage_id: e.target.value })}
            className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
          >
            <option value="">Selecionar</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
      )}
      {cond === "contains_word" && (
        <Field label="Palavra">
          <input
            value={(config.word as string) ?? ""}
            onChange={(e) => update({ word: e.target.value })}
            className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
          />
        </Field>
      )}
    </>
  );
}

function TagConfig({
  config,
  update,
  tags,
}: {
  config: Record<string, unknown>;
  update: (p: Record<string, unknown>) => void;
  tags: { id: string; name: string }[];
}) {
  return (
    <>
      <Field label="Ação">
        <select
          value={(config.action as string) ?? "add"}
          onChange={(e) => update({ action: e.target.value })}
          className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
        >
          <option value="add">Adicionar</option>
          <option value="remove">Remover</option>
        </select>
      </Field>
      <Field label="Tag">
        <select
          value={(config.tag_id as string) ?? ""}
          onChange={(e) => update({ tag_id: e.target.value })}
          className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
        >
          <option value="">Selecionar</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </Field>
    </>
  );
}

function StageConfig({
  config,
  update,
  stages,
}: {
  config: Record<string, unknown>;
  update: (p: Record<string, unknown>) => void;
  stages: { id: string; name: string }[];
}) {
  return (
    <Field label="Etapa destino">
      <select
        value={(config.stage_id as string) ?? ""}
        onChange={(e) => update({ stage_id: e.target.value })}
        className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
      >
        <option value="">Selecionar</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </Field>
  );
}

function WebhookConfig({
  config,
  update,
}: {
  config: Record<string, unknown>;
  update: (p: Record<string, unknown>) => void;
}) {
  return (
    <>
      <Field label="URL">
        <input
          value={(config.url as string) ?? ""}
          onChange={(e) => update({ url: e.target.value })}
          className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
        />
      </Field>
      <Field label="Método">
        <select
          value={(config.method as string) ?? "POST"}
          onChange={(e) => update({ method: e.target.value })}
          className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-sm text-white"
        >
          <option value="POST">POST</option>
          <option value="GET">GET</option>
        </select>
      </Field>
      <Field label="Body (JSON)">
        <textarea
          value={(config.body as string) ?? "{}"}
          onChange={(e) => update({ body: e.target.value })}
          rows={4}
          className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-xs text-white font-mono"
        />
      </Field>
    </>
  );
}
