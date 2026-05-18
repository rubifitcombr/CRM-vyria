"use client";

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { CustomNode, type FunnelNodeData } from "@/components/crm/funnel/custom-node";

const nodeTypes = { custom: CustomNode };

export function FunnelCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onDrop,
}: {
  nodes: Node<FunnelNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onNodeClick: (node: Node<FunnelNodeData>) => void;
  onDrop: (event: React.DragEvent) => void;
}) {
  return (
    <div className="h-full w-full min-h-[480px]" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onNodeClick(node as Node<FunnelNodeData>)}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#0f0f0f]"
      >
        <Background color="#333" gap={20} />
        <Controls className="!bg-[#1a1a1a] !border-[#2e2e2e]" />
        <MiniMap className="!bg-[#1a1a1a]" />
      </ReactFlow>
    </div>
  );
}
