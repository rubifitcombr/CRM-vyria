"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addEdge,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "reactflow";
import { NodeConfigPanel } from "@/components/crm/funnel/node-config-panel";
import { PALETTE_ITEMS } from "@/components/crm/funnel/node-styles";
import type { FunnelNodeData } from "@/components/crm/funnel/custom-node";
import type { Funnel, FunnelEdge, FunnelNode } from "@/types/crm";
import { ArrowLeft, Play, Save } from "lucide-react";

const FunnelCanvas = dynamic(
  () =>
    import("@/components/crm/funnel/funnel-canvas").then((m) => m.FunnelCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-gray-500">
        Carregando editor...
      </div>
    ),
  }
);

function FunnelEditorInner({ funnelId }: { funnelId: string }) {
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<FunnelNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<FunnelNodeData> | null>(
    null
  );
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [testLogs, setTestLogs] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);

    try {
      const res = await fetch(`/api/crm/funnels/${funnelId}`);
      const data = await res.json();

      if (!res.ok || !data.funnel) {
        setFunnel(null);
        setLoadError(data.error ?? "Funil não encontrado");
        setLoadState("error");
        return;
      }

      const loadedFunnel = data.funnel as Funnel;
      setFunnel(loadedFunnel);

      const flowNodes: Node<FunnelNodeData>[] = (data.nodes ?? []).map(
        (n: FunnelNode) => ({
          id: n.id,
          type: "custom",
          position: { x: n.position_x, y: n.position_y },
          data: {
            label: n.label ?? n.type,
            nodeType: n.type,
            config: n.config ?? {},
            dbId: n.id,
            funnelActive: loadedFunnel.active,
          },
        })
      );

      const flowEdges: Edge[] = (data.edges ?? []).map((e: FunnelEdge) => ({
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        sourceHandle:
          e.condition_value === "yes"
            ? "yes"
            : e.condition_value === "no"
              ? "no"
              : undefined,
        label: e.condition_label ?? undefined,
        animated: loadedFunnel.active,
        style: { stroke: "#E8521A" },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
      setLoadState("ready");
    } catch {
      setFunnel(null);
      setLoadError("Não foi possível carregar o funil");
      setLoadState("error");
    }
  }, [funnelId, setNodes, setEdges]);

  useEffect(() => {
    load();
  }, [load]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      let conditionValue: string | null = null;
      let conditionLabel: string | null = null;

      if (sourceNode?.data.nodeType === "condition") {
        conditionValue = connection.sourceHandle === "yes" ? "yes" : "no";
        conditionLabel = conditionValue === "yes" ? "Sim" : "Não";
      }

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            label: conditionLabel ?? undefined,
            data: { condition_value: conditionValue, condition_label: conditionLabel },
            animated: funnel?.active,
            style: { stroke: "#E8521A" },
          },
          eds
        )
      );
    },
    [nodes, funnel?.active, setEdges]
  );

  function onDragStart(event: React.DragEvent, nodeType: string, label: string) {
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({ nodeType, label })
    );
    event.dataTransfer.effectAllowed = "move";
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/reactflow");
    if (!raw) return;

    const { nodeType, label } = JSON.parse(raw);
    const bounds = (event.target as HTMLElement)
      .closest(".react-flow")
      ?.getBoundingClientRect();
    if (!bounds) return;

    const id = crypto.randomUUID();
    const newNode: Node<FunnelNodeData> = {
      id,
      type: "custom",
      position: {
        x: event.clientX - bounds.left - 90,
        y: event.clientY - bounds.top - 30,
      },
      data: {
        label,
        nodeType: nodeType,
        config: getDefaultConfig(nodeType),
        dbId: id,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/funnels/${funnelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funnel: {
            name: funnel?.name,
            active: funnel?.active,
            description: funnel?.description,
            trigger_keyword: funnel?.trigger_keyword,
            trigger_type: funnel?.trigger_type,
          },
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.data.nodeType,
            label: n.data.label,
            config: n.data.config,
            position_x: n.position.x,
            position_y: n.position.y,
          })),
          edges: edges.map((e) => ({
            source_node_id: e.source,
            target_node_id: e.target,
            condition_value: e.data?.condition_value ?? null,
            condition_label: e.label ?? null,
          })),
          deleted_node_ids: deletedIds,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setDeletedIds([]);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    const res = await fetch(`/api/crm/funnels/${funnelId}/test`, {
      method: "POST",
    });
    const data = await res.json();
    setTestLogs(data.logs ?? [data.error ?? "Erro"]);
  }

  const categories = useMemo(() => {
    const map = new Map<string, typeof PALETTE_ITEMS>();
    PALETTE_ITEMS.forEach((item) => {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    });
    return map;
  }, []);

  if (loadState === "loading") {
    return (
      <div className="flex h-full min-h-0 items-center justify-center text-gray-500">
        Carregando funil...
      </div>
    );
  }

  if (loadState === "error" || !funnel) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-gray-400">{loadError ?? "Funil não encontrado"}</p>
        <div className="flex gap-3">
          <button
            onClick={() => load()}
            className="rounded-lg bg-[#252525] px-4 py-2 text-sm text-white"
          >
            Tentar novamente
          </button>
          <Link
            href="/crm/funnels"
            className="rounded-lg bg-[#E8521A] px-4 py-2 text-sm text-white"
          >
            Voltar aos funis
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-4 border-b border-[#2e2e2e] bg-[#1a1a1a] px-4 py-3">
        <Link href="/crm/funnels" className="text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <input
          value={funnel.name}
          onChange={(e) => setFunnel({ ...funnel, name: e.target.value })}
          className="bg-transparent text-lg font-semibold text-white outline-none"
        />
        <button
          onClick={() => setFunnel({ ...funnel, active: !funnel.active })}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            funnel.active
              ? "bg-green-500/20 text-green-400"
              : "bg-gray-500/20 text-gray-400"
          }`}
        >
          {funnel.active ? "Ativo" : "Inativo"}
        </button>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleTest}
            className="flex items-center gap-2 rounded-lg bg-[#252525] px-3 py-1.5 text-sm text-white"
          >
            <Play size={16} /> Testar funil
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#E8521A] px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            <Save size={16} /> {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="w-60 shrink-0 overflow-y-auto border-r border-[#2e2e2e] bg-[#1a1a1a] p-3">
          {Array.from(categories.entries()).map(([cat, items]) => (
            <div key={cat} className="mb-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {cat}
              </p>
              <div className="space-y-1">
                {items.map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, item.type, item.label)}
                    className="cursor-grab rounded-lg border border-[#2e2e2e] bg-[#252525] px-3 py-2 text-sm text-gray-300 hover:border-[#E8521A]/50"
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <div className="relative min-h-0 min-w-0 flex-1">
          <FunnelCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={setSelectedNode}
            onDrop={onDrop}
          />
        </div>
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onChange={(config, label) => {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === selectedNode.id
                    ? {
                        ...n,
                        data: {
                          ...n.data,
                          config,
                          label: label ?? n.data.label,
                        },
                      }
                    : n
                )
              );
            }}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      {testLogs && (
        <div className="shrink-0 border-t border-[#2e2e2e] bg-[#1a1a1a] p-4">
          <div className="mb-2 flex justify-between">
            <span className="text-sm font-medium text-white">Log do teste</span>
            <button onClick={() => setTestLogs(null)} className="text-gray-500">
              ×
            </button>
          </div>
          <pre className="max-h-32 overflow-auto text-xs text-gray-400">
            {testLogs.join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
}

export function FunnelEditor({ funnelId }: { funnelId: string }) {
  return (
    <ReactFlowProvider>
      <FunnelEditorInner funnelId={funnelId} />
    </ReactFlowProvider>
  );
}

function getDefaultConfig(nodeType: string): Record<string, unknown> {
  switch (nodeType) {
    case "trigger":
      return { triggerType: "keyword", keyword: "" };
    case "message":
      return {
        messageType: "text",
        text: "",
        delay: 0,
        typing: false,
        waitForReply: true,
        media_url: "",
        link_url: "",
      };
    case "wait":
      return { waitType: "fixed", amount: 5, unit: "minutes" };
    case "condition":
      return { condition: "has_response" };
    case "tag":
      return { action: "add", tag_id: "" };
    case "move_stage":
      return { stage_id: "" };
    case "webhook":
      return { url: "", method: "POST", body: "{}" };
    default:
      return {};
  }
}
