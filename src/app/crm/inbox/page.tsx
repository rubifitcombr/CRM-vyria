"use client";

import { useCallback, useEffect, useState } from "react";
import { ConversationList } from "@/components/crm/inbox/conversation-list";
import { ActiveChat } from "@/components/crm/inbox/active-chat";
import { createClient } from "@/lib/supabase/client";
import type { InboxConversation } from "@/types/crm";
import { MessageSquare } from "lucide-react";

export default function InboxPage() {
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams({ filter });
    if (search) params.set("q", search);
    const res = await fetch(`/api/crm/conversations?${params}`);
    const data = await res.json();
    setConversations(data.conversations ?? []);
  }, [filter, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("crm-inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const active = conversations.find((c) => c.id === activeId);
  const unreadTotal = conversations.reduce(
    (sum, c) => sum + (c.unread_count ?? 0),
    0
  );

  return (
    <div className="flex h-screen">
      <ConversationList
        conversations={conversations}
        activeId={activeId}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        onSelect={setActiveId}
        unreadTotal={unreadTotal}
      />
      {active ? (
        <ActiveChat conversation={active} onUpdate={load} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-gray-500">
          <MessageSquare size={48} className="mb-4 opacity-30" />
          <p>Selecione uma conversa</p>
        </div>
      )}
    </div>
  );
}
