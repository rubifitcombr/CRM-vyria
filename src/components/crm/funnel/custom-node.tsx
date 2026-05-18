"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { NODE_COLORS, NODE_ICONS } from "@/components/crm/funnel/node-styles";
import type { NodeType } from "@/types/crm";

export type FunnelNodeData = {
  label: string;
  nodeType: NodeType;
  config: Record<string, unknown>;
  dbId: string;
  funnelActive?: boolean;
};

function CustomNodeComponent({ data, selected }: NodeProps<FunnelNodeData>) {
  if (!data?.nodeType) return null;
  const nodeType = data.nodeType;
  const color = NODE_COLORS[nodeType] ?? "#888888";
  const preview = getPreview({ ...data, nodeType });

  return (
    <div
      className={`min-w-[180px] rounded-xl border-2 bg-[#1a1a1a] shadow-lg transition ${
        selected ? "ring-2 ring-[#E8521A]/50" : ""
      } ${data.funnelActive ? "animate-pulse" : ""}`}
      style={{ borderColor: color }}
    >
      {nodeType !== "trigger" && (
        <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      )}

      <div className="border-b border-[#2e2e2e] px-3 py-2" style={{ borderTopColor: color }}>
        <div className="flex items-center gap-2">
          <span>{NODE_ICONS[nodeType]}</span>
          <span className="text-xs font-semibold text-white">{data.label}</span>
        </div>
      </div>

      <div className="px-3 py-2 text-[11px] text-gray-400">{preview}</div>

      {nodeType === "condition" ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            style={{ left: "30%", background: "#10B981" }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            style={{ left: "70%", background: "#EF4444" }}
          />
          <div className="flex justify-between px-3 pb-2 text-[10px]">
            <span className="text-green-400">Sim</span>
            <span className="text-red-400">Não</span>
          </div>
        </>
      ) : nodeType !== "end" ? (
        <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
      ) : null}
    </div>
  );
}

function getPreview(data: FunnelNodeData): string {
  const c = data.config;
  switch (data.nodeType) {
    case "message": {
      const type = (c.messageType as string) ?? "text";
      const labels: Record<string, string> = {
        text: "Texto",
        image: "Imagem",
        audio: "Áudio",
        video: "Vídeo",
        link: "Link",
        document: "Arquivo",
      };
      const preview = String(c.text ?? c.link_url ?? labels[type] ?? "").slice(0, 40);
      const wait = c.waitForReply !== false ? " · aguarda resposta" : "";
      return `${labels[type] ?? type}: ${preview}${wait}`;
    }
    case "trigger":
      return String(c.keyword ?? c.triggerType ?? "Entrada");
    case "wait":
      return (c.waitType as string) === "response"
        ? "Aguardar resposta do lead"
        : `${c.amount ?? 1} ${c.unit ?? "minutos"}`;
    case "condition":
      return String(c.condition ?? "Condição");
    case "tag":
      return `${c.action ?? "add"} tag`;
    case "webhook":
      return String(c.url ?? "URL").slice(0, 40);
    case "end":
      return "Fim do fluxo";
    default:
      return data.label;
  }
}

export const CustomNode = memo(CustomNodeComponent);
