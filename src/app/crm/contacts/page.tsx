"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/crm/avatar";
import { Download, Upload, MessageSquare } from "lucide-react";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Record<string, unknown>[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [filterTag, setFilterTag] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [search, setSearch] = useState("");

  function load() {
    const params = new URLSearchParams();
    if (filterTag) params.set("tag", filterTag);
    if (filterStage) params.set("stage", filterStage);
    if (search) params.set("q", search);
    fetch(`/api/crm/contacts?${params}`)
      .then((r) => r.json())
      .then((d) => setContacts(d.contacts ?? []));
  }

  useEffect(() => {
    load();
    fetch("/api/crm/tags").then((r) => r.json()).then((d) => setTags(d.tags ?? []));
    fetch("/api/crm/pipeline/stages").then((r) => r.json()).then((d) => setStages(d.stages ?? []));
  }, [filterTag, filterStage, search]);

  function exportCsv() {
    const headers = ["nome", "telefone"];
    const rows = contacts.map((c) => {
      const contact = c as { name?: string; phone: string };
      return [contact.name ?? "", contact.phone];
    });
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contatos.csv";
    a.click();
  }

  async function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").slice(1);
    for (const line of lines) {
      const [name, phone] = line.split(",").map((s) => s.trim());
      if (phone) {
        await fetch("/api/crm/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone }),
        });
      }
    }
    load();
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Contatos</h1>
        <div className="flex gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#252525] px-3 py-2 text-sm text-white">
            <Upload size={16} /> Importar CSV
            <input type="file" accept=".csv" onChange={importCsv} className="hidden" />
          </label>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-lg bg-[#252525] px-3 py-2 text-sm text-white"
          >
            <Download size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="rounded-lg border border-[#2e2e2e] bg-[#252525] px-3 py-2 text-sm text-white"
        />
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="rounded-lg border border-[#2e2e2e] bg-[#252525] px-3 py-2 text-sm text-white"
        >
          <option value="">Todas as tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="rounded-lg border border-[#2e2e2e] bg-[#252525] px-3 py-2 text-sm text-white"
        >
          <option value="">Todas as etapas</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-[#2e2e2e]">
        <table className="w-full text-sm">
          <thead className="bg-[#1a1a1a] text-left text-gray-500">
            <tr>
              <th className="p-3">Contato</th>
              <th className="p-3">Número</th>
              <th className="p-3">Tags</th>
              <th className="p-3">Etapa</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => {
              const contact = c as {
                id: string;
                name: string | null;
                phone: string;
                contact_tags?: { tags: { name: string; color: string } }[];
                contact_pipeline?: { pipeline_stages: { name: string } };
              };
              return (
                <tr key={contact.id} className="border-t border-[#2e2e2e] hover:bg-[#1a1a1a]">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={contact.name} phone={contact.phone} size="sm" />
                      <span className="text-white">{contact.name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-400">{contact.phone}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {contact.contact_tags?.map((ct, i) => (
                        <span
                          key={i}
                          className="rounded px-1.5 py-0.5 text-[10px] text-white"
                          style={{ backgroundColor: ct.tags?.color }}
                        >
                          {ct.tags?.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-gray-400">
                    {contact.contact_pipeline?.pipeline_stages?.name ?? "—"}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/crm/contacts/${contact.id}`}
                      className="mr-2 text-[#E8521A] hover:underline"
                    >
                      Ver
                    </Link>
                    <Link href="/crm/inbox" className="text-gray-400 hover:text-white">
                      <MessageSquare size={14} className="inline" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
