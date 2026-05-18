"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, GitBranch, BarChart2 } from "lucide-react";
import type { Funnel } from "@/types/crm";

export default function FunnelsPage() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/crm/funnels")
      .then((r) => r.json())
      .then((d) => setFunnels(d.funnels ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function createFunnel() {
    const res = await fetch("/api/crm/funnels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Novo funil" }),
    });
    const data = await res.json();
    if (!res.ok || !data.funnel) {
      alert(data.error ?? "Não foi possível criar o funil");
      return;
    }
    window.location.href = `/crm/funnels/${data.funnel.id}`;
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Funis</h1>
        <button
          onClick={createFunnel}
          className="flex items-center gap-2 rounded-lg bg-[#E8521A] px-4 py-2 text-sm text-white"
        >
          <Plus size={18} /> Novo funil
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : funnels.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-gray-500">
          <GitBranch size={48} className="mb-4 opacity-30" />
          <p>Nenhum funil criado</p>
          <button onClick={createFunnel} className="mt-4 text-[#E8521A]">
            Criar primeiro funil
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {funnels.map((f) => (
            <div
              key={f.id}
              className="rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] p-5 transition hover:border-[#E8521A]/30"
            >
              <div className="mb-3 flex items-start justify-between">
                <h3 className="font-semibold text-white">{f.name}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    f.active
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray-500/20 text-gray-500"
                  }`}
                >
                  {f.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="mb-4 text-sm text-gray-500 line-clamp-2">
                {f.description ?? "Sem descrição"}
              </p>
              <div className="flex gap-2">
                <Link
                  href={`/crm/funnels/${f.id}`}
                  className="flex-1 rounded-lg bg-[#E8521A] py-2 text-center text-sm text-white"
                >
                  Editar
                </Link>
                <Link
                  href={`/crm/funnels/${f.id}/stats`}
                  className="flex items-center justify-center rounded-lg bg-[#252525] px-3 text-gray-400 hover:text-white"
                >
                  <BarChart2 size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
