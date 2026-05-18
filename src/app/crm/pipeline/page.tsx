"use client";

import { useCallback, useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar } from "@/components/crm/avatar";
import { Plus } from "lucide-react";
import { truncate } from "@/lib/utils";

type Stage = { id: string; name: string; color: string; sort_order: number };
type Lead = {
  id: string;
  name: string | null;
  phone: string;
  contact_tags?: { tags: { name: string; color: string } }[];
  conversations?: { funnels?: { name: string } }[];
  last_message?: { content: string; created_at: string };
};

export default function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [leadsByStage, setLeadsByStage] = useState<Record<string, Lead[]>>({});
  const [showModal, setShowModal] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [stagesRes, contactsRes] = await Promise.all([
      fetch("/api/crm/pipeline/stages"),
      fetch("/api/crm/contacts"),
    ]);
    const stagesData = await stagesRes.json();
    const contactsData = await contactsRes.json();
    const st: Stage[] = stagesData.stages ?? [];
    setStages(st);

    const map: Record<string, Lead[]> = {};
    st.forEach((s) => {
      map[s.id] = [];
    });

    (contactsData.contacts ?? []).forEach(
      (c: Lead & { contact_pipeline?: { stage_id: string } }) => {
        const stageId = c.contact_pipeline?.stage_id ?? st[0]?.id;
        if (stageId && map[stageId]) {
          map[stageId].push(c);
        }
      }
    );
    setLeadsByStage(map);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const contactId = active.id as string;
    const stageId = over.id as string;

    await fetch("/api/crm/pipeline/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: contactId, stage_id: stageId }),
    });
    load();
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-[#2e2e2e] px-6 py-4">
        <h1 className="text-2xl font-bold text-white">Pipeline</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#E8521A] px-4 py-2 text-sm text-white"
        >
          <Plus size={18} /> Novo Lead
        </button>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto p-4">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={leadsByStage[stage.id] ?? []}
            />
          ))}
        </div>
      </DndContext>

      {showModal && <NewLeadModal onClose={() => setShowModal(false)} onCreated={load} stages={stages} />}
    </div>
  );
}

function KanbanColumn({ stage, leads }: { stage: Stage; leads: Lead[] }) {
  const { setNodeRef } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className="flex w-72 shrink-0 flex-col rounded-xl bg-[#1a1a1a]"
    >
      <div
        className="flex items-center justify-between rounded-t-xl border-b border-[#2e2e2e] px-4 py-3"
        style={{ borderTop: `3px solid ${stage.color}` }}
      >
        <h3 className="font-medium text-white">{stage.name}</h3>
        <span className="rounded-full bg-[#252525] px-2 py-0.5 text-xs text-gray-400">
          {leads.length}
        </span>
      </div>
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 overflow-y-auto p-3 min-h-[200px]">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="block rounded-lg border border-[#2e2e2e] bg-[#252525] p-3 transition hover:border-[#E8521A]/30 cursor-grab"
    >
      <div className="flex items-center gap-2">
        <Avatar name={lead.name} phone={lead.phone} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {lead.name ?? lead.phone}
          </p>
          <p className="text-[10px] text-gray-500">{lead.phone}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {truncate(lead.last_message?.content ?? "", 50)}
      </p>
      <Link href={`/crm/inbox`} className="mt-2 block text-[10px] text-[#E8521A]">
        Ver conversa
      </Link>
    </div>
  );
}

function NewLeadModal({
  onClose,
  onCreated,
  stages,
}: {
  onClose: () => void;
  onCreated: () => void;
  stages: Stage[];
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/crm/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, stage_id: stageId }),
    });
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Novo Lead</h2>
        <form onSubmit={submit} className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            className="w-full rounded-lg border border-[#2e2e2e] bg-[#252525] px-3 py-2 text-white"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="WhatsApp (5562999999999)"
            required
            className="w-full rounded-lg border border-[#2e2e2e] bg-[#252525] px-3 py-2 text-white"
          />
          <select
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            className="w-full rounded-lg border border-[#2e2e2e] bg-[#252525] px-3 py-2 text-white"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-[#252525] py-2 text-white">
              Cancelar
            </button>
            <button type="submit" className="flex-1 rounded-lg bg-[#E8521A] py-2 text-white">
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
