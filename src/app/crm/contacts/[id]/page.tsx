"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/crm/avatar";
import type { Contact } from "@/types/crm";

export default function ContactProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [contact, setContact] = useState<Contact | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch(`/api/crm/contacts?q=`)
      .then((r) => r.json())
      .then((d) => {
        const found = (d.contacts ?? []).find((c: Contact) => c.id === id);
        if (found) {
          setContact(found);
          setName(found.name ?? "");
          setNotes(found.notes ?? "");
        }
      });
  }, [id]);

  async function save() {
    await fetch("/api/crm/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name, notes }),
    });
  }

  if (!contact) {
    return <div className="p-6 text-gray-500">Carregando...</div>;
  }

  return (
    <div className="p-6">
      <Link href="/crm/contacts" className="mb-6 inline-flex items-center gap-2 text-gray-400 hover:text-white">
        <ArrowLeft size={18} /> Voltar
      </Link>
      <div className="flex items-start gap-6">
        <Avatar name={contact.name} phone={contact.phone} photoUrl={contact.photo_url} size="lg" />
        <div className="flex-1 max-w-lg space-y-4">
          <div>
            <span className="text-xs text-gray-500">Nome</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#2e2e2e] bg-[#252525] px-3 py-2 text-white"
            />
          </div>
          <div>
            <span className="text-xs text-gray-500">Telefone</span>
            <p className="mt-1 text-white">{contact.phone}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Notas</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-[#2e2e2e] bg-[#252525] px-3 py-2 text-white"
            />
          </div>
          <p className="text-xs text-gray-500">
            Criado em {new Date(contact.created_at).toLocaleString("pt-BR")}
          </p>
          <button onClick={save} className="rounded-lg bg-[#E8521A] px-4 py-2 text-white">
            Salvar
          </button>
          <Link href="/crm/inbox" className="ml-3 text-sm text-[#E8521A]">
            Ver conversa
          </Link>
        </div>
      </div>
    </div>
  );
}
