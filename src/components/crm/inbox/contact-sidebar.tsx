"use client";

import { useEffect, useState } from "react";
import type { Contact, Conversation, PipelineStage, Tag } from "@/types/crm";

export function ContactSidebar({
  contact,
  conversation,
  onUpdate,
}: {
  contact: Contact;
  conversation: Conversation & {
    funnel?: { name: string } | null;
    current_node?: { label: string | null } | null;
    stage?: PipelineStage | null;
  };
  onUpdate: () => void;
}) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [funnels, setFunnels] = useState<{ id: string; name: string }[]>([]);
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [selectedTag, setSelectedTag] = useState("");

  useEffect(() => {
    fetch("/api/crm/tags").then((r) => r.json()).then((d) => setTags(d.tags ?? []));
    fetch("/api/crm/pipeline/stages").then((r) => r.json()).then((d) => setStages(d.stages ?? []));
    fetch("/api/crm/funnels").then((r) => r.json()).then((d) => setFunnels(d.funnels ?? []));
    setNotes(contact.notes ?? "");
  }, [contact]);

  async function saveNotes() {
    await fetch("/api/crm/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contact.id, notes }),
    });
    onUpdate();
  }

  async function addTag() {
    if (!selectedTag) return;
    await fetch(`/api/crm/contacts/${contact.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag_id: selectedTag }),
    });
    setSelectedTag("");
    onUpdate();
  }

  async function changeStage(stageId: string) {
    await fetch("/api/crm/pipeline/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: contact.id, stage_id: stageId }),
    });
    onUpdate();
  }

  async function addToFunnel(funnelId: string) {
    await fetch(`/api/crm/funnels/${funnelId}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: conversation.id }),
    });
    onUpdate();
  }

  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-l border-[#2e2e2e] bg-[#1a1a1a] p-4 text-sm">
      <h4 className="mb-3 font-medium text-white">Informações</h4>
      <p className="text-gray-400">{contact.name ?? "—"}</p>
      <p className="text-gray-500">{contact.phone}</p>
      <p className="mt-2 text-xs text-gray-500">
        Criado em {new Date(contact.created_at).toLocaleDateString("pt-BR")}
      </p>

      <hr className="my-4 border-[#2e2e2e]" />

      <h4 className="mb-2 font-medium text-white">Tags</h4>
      <div className="flex gap-1">
        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className="flex-1 rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1 text-xs text-white"
        >
          <option value="">Adicionar tag...</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <button onClick={addTag} className="rounded bg-[#E8521A] px-2 text-xs text-white">
          +
        </button>
      </div>

      <hr className="my-4 border-[#2e2e2e]" />

      <h4 className="mb-2 font-medium text-white">Pipeline</h4>
      <select
        value={conversation.stage?.id ?? ""}
        onChange={(e) => changeStage(e.target.value)}
        className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-xs text-white"
      >
        <option value="">Selecionar etapa</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <hr className="my-4 border-[#2e2e2e]" />

      <h4 className="mb-2 font-medium text-white">Funil</h4>
      {conversation.funnel ? (
        <div className="rounded-lg bg-[#252525] p-2 text-xs">
          <p className="text-white">{conversation.funnel.name}</p>
          <p className="text-gray-500">
            Nó: {conversation.current_node?.label ?? "—"}
          </p>
        </div>
      ) : (
        <select
          onChange={(e) => e.target.value && addToFunnel(e.target.value)}
          className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-xs text-white"
          defaultValue=""
        >
          <option value="">Adicionar ao funil...</option>
          {funnels.filter((f) => f).map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      )}

      <hr className="my-4 border-[#2e2e2e]" />

      <h4 className="mb-2 font-medium text-white">Notas</h4>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        className="w-full rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1.5 text-xs text-white"
      />
      <button
        onClick={saveNotes}
        className="mt-2 w-full rounded bg-[#252525] py-1.5 text-xs text-white hover:bg-[#333]"
      >
        Salvar notas
      </button>
    </aside>
  );
}
