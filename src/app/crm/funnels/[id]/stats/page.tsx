"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function FunnelStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [stats, setStats] = useState({
    active: 0,
    completed: 0,
    failed: 0,
    logs: 0,
  });

  useEffect(() => {
    async function load() {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const [active, completed, failed, logs] = await Promise.all([
        supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("funnel_id", id)
          .eq("status", "active"),
        supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("funnel_id", id)
          .eq("status", "completed"),
        supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("funnel_id", id)
          .eq("status", "failed"),
        supabase
          .from("funnel_logs")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", id),
      ]);
      setStats({
        active: active.count ?? 0,
        completed: completed.count ?? 0,
        failed: failed.count ?? 0,
        logs: logs.count ?? 0,
      });
    }
    load();
  }, [id]);

  const cards = [
    { label: "Ativas", value: stats.active, color: "#3B82F6" },
    { label: "Concluídas", value: stats.completed, color: "#10B981" },
    { label: "Falhas", value: stats.failed, color: "#EF4444" },
    { label: "Logs", value: stats.logs, color: "#E8521A" },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/crm/funnels/${id}`} className="text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-white">Métricas do funil</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] p-6"
          >
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-2 text-3xl font-bold" style={{ color: c.color }}>
              {c.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
