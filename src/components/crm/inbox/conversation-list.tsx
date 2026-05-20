"use client";

import { Avatar } from "@/components/crm/avatar";
import { cn, formatPhone, truncate } from "@/lib/utils";
import type { InboxConversation } from "@/types/crm";

const filters = [
  { id: "all", label: "Todas" },
  { id: "unread", label: "Não lidas" },
  { id: "waiting", label: "Aguardando" },
  { id: "funnel", label: "Em funil" },
] as const;

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function ConversationList({
  conversations,
  activeId,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  onSelect,
  unreadTotal,
}: {
  conversations: InboxConversation[];
  activeId?: string;
  filter: string;
  onFilterChange: (f: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
  onSelect: (id: string) => void;
  unreadTotal: number;
}) {
  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-r border-[#2e2e2e] bg-[#1a1a1a]">
      <div className="border-b border-[#2e2e2e] p-4">
          <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Inbox</h2>
          {unreadTotal > 0 && (
            <span className="rounded-full bg-[#E8521A] px-2 py-0.5 text-xs font-medium text-white">
              {unreadTotal}
            </span>
          )}
        </div>
        <div className="mb-3 flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs transition",
                filter === f.id
                  ? "bg-[#E8521A] text-white"
                  : "bg-[#252525] text-gray-400 hover:text-white"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar nome ou número..."
          className="w-full rounded-lg border border-[#2e2e2e] bg-[#252525] px-3 py-2 text-sm text-white outline-none focus:border-[#E8521A]"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500">
            Nenhuma conversa encontrada. Quando o WhatsApp receber uma mensagem, ela
            aparecerá aqui.
          </div>
        ) : null}
        {conversations.map((conv) => {
          const contact = conv.contact;
          const active = conv.id === activeId;
          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "flex w-full gap-3 border-b border-[#2e2e2e]/50 p-3 text-left transition hover:bg-[#252525]",
                active && "bg-[#252525]"
              )}
            >
              <div className="relative shrink-0">
                <Avatar name={contact?.name ?? null} phone={contact?.phone ?? ""} photoUrl={contact?.photo_url} />
                {(conv.unread_count ?? 0) > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#E8521A]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-white">
                    {contact?.name ?? formatPhone(contact?.phone ?? "")}
                  </span>
                  <span className="shrink-0 text-[10px] text-gray-500">
                    {conv.last_message?.created_at
                      ? formatRelativeTime(conv.last_message.created_at)
                      : ""}
                  </span>
                </div>
                <p className="truncate text-xs text-gray-500">
                  {truncate(conv.last_message?.content ?? "Sem mensagens", 40)}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {conv.tags?.slice(0, 3).map((tag) => (
                    <span
                      key={tag?.id}
                      className="rounded px-1.5 py-0.5 text-[10px] text-white"
                      style={{ backgroundColor: tag?.color ?? "#E8521A" }}
                    >
                      {tag?.name}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
