export type FunnelTriggerType = "keyword" | "manual" | "new_contact" | "tag";
export type NodeType =
  | "trigger"
  | "message"
  | "wait"
  | "condition"
  | "tag"
  | "move_stage"
  | "webhook"
  | "end";

export type ConversationStatus =
  | "active"
  | "waiting"
  | "paused"
  | "completed"
  | "failed";

export type MessageDirection = "inbound" | "outbound";
export type MessageType = "text" | "audio" | "video" | "image" | "document";
export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";
export type SentBy = "auto" | "manual";

export interface Funnel {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  trigger_keyword: string | null;
  trigger_type: FunnelTriggerType;
  created_at: string;
}

export interface FunnelNode {
  id: string;
  funnel_id: string;
  type: NodeType;
  label: string | null;
  config: Record<string, unknown>;
  position_x: number;
  position_y: number;
  created_at: string;
}

export interface FunnelEdge {
  id: string;
  funnel_id: string;
  source_node_id: string;
  target_node_id: string;
  condition_label: string | null;
  condition_value: string | null;
}

export interface Contact {
  id: string;
  phone: string;
  name: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  last_seen_at: string | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

export interface Conversation {
  id: string;
  contact_id: string;
  funnel_id: string | null;
  current_node_id: string | null;
  status: ConversationStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  contact_id: string;
  direction: MessageDirection;
  type: MessageType;
  content: string | null;
  media_url: string | null;
  status: MessageStatus;
  sent_by: SentBy;
  evolution_message_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface InboxConversation extends Conversation {
  contact: Contact;
  last_message?: Message | null;
  tags?: Tag[];
  stage?: PipelineStage | null;
  funnel?: Funnel | null;
  current_node?: FunnelNode | null;
  unread_count?: number;
}

export interface CrmSettings {
  evolution_base_url?: string;
  evolution_api_key?: string;
  evolution_instance?: string;
  attendant_name?: string;
  test_phone?: string;
  default_typing?: boolean;
  default_delay?: number;
}
