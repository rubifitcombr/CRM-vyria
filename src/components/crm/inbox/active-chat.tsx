"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/crm/avatar";
import { MessageBubble } from "@/components/crm/inbox/message-bubble";
import { MessageComposer } from "@/components/crm/inbox/message-composer";
import { ContactSidebar } from "@/components/crm/inbox/contact-sidebar";
import { formatPhone } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Contact, Conversation, Message, PipelineStage, Tag } from "@/types/crm";
import { ChevronDown, PanelRight, Pause, Play, User } from "lucide-react";

export function ActiveChat({
  conversation,
  onUpdate,
}: {
  conversation: Conversation & {
    contact: Contact;
    tags?: Tag[];
    stage?: PipelineStage | null;
    funnel?: { id: string; name: string } | null;
    current_node?: { label: string | null } | null;
  };
  onUpdate: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showStageMenu, setShowStageMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const contact = conversation.contact;

  async function loadMessages() {
    const res = await fetch(
      `/api/crm/messages?conversation_id=${conversation.id}`
    );
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  useEffect(() => {
    loadMessages();
    fetch("/api/crm/pipeline/stages")
      .then((r) => r.json())
      .then((d) => setStages(d.stages ?? []));
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, onUpdate]);

  async function toggleFunnelPause() {
    const newStatus =
      conversation.status === "paused" ? "active" : "paused";
    await fetch("/api/crm/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: conversation.id, status: newStatus }),
    });
    onUpdate();
  }

  async function moveStage(stageId: string) {
    await fetch("/api/crm/pipeline/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact_id: contact.id,
        stage_id: stageId,
        funnel_id: conversation.funnel_id,
      }),
    });
    setShowStageMenu(false);
    onUpdate();
  }

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-[#2e2e2e] bg-[#1a1a1a] px-4 py-3">
          <Avatar name={contact.name} phone={contact.phone} photoUrl={contact.photo_url} />
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-white">{contact.name ?? "Sem nome"}</h3>
            <p className="text-xs text-gray-500">{formatPhone(contact.phone)}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {conversation.tags?.map((tag) => (
                <TagPill key={tag.id} tag={tag} contactId={contact.id} onUpdate={onUpdate} />
              ))}
            </div>
          </div>
          <Link
            href={`/crm/contacts/${contact.id}`}
            className="flex items-center gap-1 rounded-lg bg-[#252525] px-3 py-1.5 text-xs text-gray-300 hover:text-white"
          >
            <User size={14} /> Ver perfil
          </Link>
          <div className="relative">
            <button
              onClick={() => setShowStageMenu(!showStageMenu)}
              className="flex items-center gap-1 rounded-lg bg-[#252525] px-3 py-1.5 text-xs text-gray-300"
            >
              Pipeline <ChevronDown size={14} />
            </button>
            {showStageMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-[#2e2e2e] bg-[#252525] py-1 shadow-xl">
                {stages.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => moveStage(s.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#333]"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {conversation.funnel_id && (
            <button
              onClick={toggleFunnelPause}
              className="flex items-center gap-1 rounded-lg bg-[#252525] px-3 py-1.5 text-xs text-gray-300"
            >
              {conversation.status === "paused" ? (
                <><Play size={14} /> Retomar</>
              ) : (
                <><Pause size={14} /> Pausar funil</>
              )}
            </button>
          )}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="rounded-lg p-2 text-gray-400 hover:bg-[#252525]"
          >
            <PanelRight size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
        <MessageComposer
          contactId={contact.id}
          phone={contact.phone}
          onSent={() => {
            loadMessages();
            onUpdate();
          }}
        />
      </div>
      {showSidebar && (
        <ContactSidebar
          contact={contact}
          conversation={conversation}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}

function TagPill({
  tag,
  contactId,
  onUpdate,
}: {
  tag: Tag;
  contactId: string;
  onUpdate: () => void;
}) {
  async function remove() {
    await fetch(`/api/crm/contacts/${contactId}/tags?tag_id=${tag.id}`, {
      method: "DELETE",
    });
    onUpdate();
  }

  return (
    <button
      onClick={remove}
      className="rounded px-1.5 py-0.5 text-[10px] text-white"
      style={{ backgroundColor: tag.color }}
      title="Clique para remover"
    >
      {tag.name} ×
    </button>
  );
}
