import type { NodeType } from "@/types/crm";

export const NODE_COLORS: Record<NodeType, string> = {
  trigger: "#E8521A",
  message: "#3B82F6",
  wait: "#F59E0B",
  condition: "#8B5CF6",
  tag: "#10B981",
  move_stage: "#06B6D4",
  webhook: "#6B7280",
  end: "#10B981",
};

export const NODE_ICONS: Record<NodeType, string> = {
  trigger: "🎯",
  message: "💬",
  wait: "⏰",
  condition: "🔀",
  tag: "🏷️",
  move_stage: "📊",
  webhook: "🔗",
  end: "✅",
};

export const PALETTE_ITEMS = [
  { type: "trigger" as const, label: "Trigger", category: "ENTRADA" },
  { type: "message" as const, label: "Mensagem", category: "AÇÕES" },
  { type: "wait" as const, label: "Aguardar", category: "AÇÕES" },
  { type: "tag" as const, label: "Tag", category: "AÇÕES" },
  { type: "move_stage" as const, label: "Mover etapa", category: "AÇÕES" },
  { type: "condition" as const, label: "Condição", category: "LÓGICA" },
  { type: "webhook" as const, label: "Webhook", category: "LÓGICA" },
  { type: "end" as const, label: "Fim", category: "FIM" },
];
