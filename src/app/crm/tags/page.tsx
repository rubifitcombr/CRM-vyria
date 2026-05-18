"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { Tag } from "@/types/crm";

type TagWithCount = Tag & { contact_count: number };

export default function TagsPage() {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  function load() {
    fetch("/api/crm/tags")
      .then((r) => r.json())
      .then((d) => setTags(d.tags ?? []));
  }

  useEffect(() => {
    load();
  }, []);

  async function createTag() {
    if (!newName.trim()) return;
    await fetch("/api/crm/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setNewName("");
    load();
  }

  async function updateTag(tag: TagWithCount) {
    await fetch("/api/crm/tags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tag.id, name: tag.name, color: tag.color }),
    });
    setEditing(null);
    load();
  }

  async function deleteTag(id: string) {
    if (!confirm("Excluir tag?")) return;
    await fetch(`/api/crm/tags?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-white">Tags</h1>

      <div className="mb-6 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova tag..."
          className="rounded-lg border border-[#2e2e2e] bg-[#252525] px-3 py-2 text-white"
        />
        <button onClick={createTag} className="flex items-center gap-2 rounded-lg bg-[#E8521A] px-4 py-2 text-white">
          <Plus size={18} /> Criar
        </button>
      </div>

      <div className="space-y-2">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-4 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] p-4"
          >
            <input
              type="color"
              value={tag.color}
              onChange={(e) => {
                const updated = tags.map((t) =>
                  t.id === tag.id ? { ...t, color: e.target.value } : t
                );
                setTags(updated);
              }}
              className="h-8 w-8 cursor-pointer rounded border-0"
            />
            {editing === tag.id ? (
              <input
                value={tag.name}
                onChange={(e) => {
                  setTags(tags.map((t) =>
                    t.id === tag.id ? { ...t, name: e.target.value } : t
                  ));
                }}
                className="flex-1 rounded border border-[#2e2e2e] bg-[#252525] px-2 py-1 text-white"
              />
            ) : (
              <span className="flex-1 font-medium text-white">{tag.name}</span>
            )}
            <span className="text-sm text-gray-500">{tag.contact_count} contatos</span>
            {editing === tag.id ? (
              <button onClick={() => updateTag(tag)} className="text-sm text-[#E8521A]">
                Salvar
              </button>
            ) : (
              <button onClick={() => setEditing(tag.id)} className="text-sm text-gray-400">
                Editar
              </button>
            )}
            <button onClick={() => deleteTag(tag.id)} className="text-sm text-red-400">
              Excluir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
