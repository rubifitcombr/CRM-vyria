-- Vyria CRM Schema

CREATE TABLE IF NOT EXISTS funnels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  active boolean DEFAULT true,
  trigger_keyword text,
  trigger_type text DEFAULT 'keyword'
    CHECK (trigger_type IN ('keyword', 'manual', 'new_contact', 'tag')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS funnel_nodes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id uuid REFERENCES funnels(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'trigger', 'message', 'wait', 'condition', 'tag',
    'move_stage', 'webhook', 'end'
  )),
  label text,
  config jsonb DEFAULT '{}',
  position_x float DEFAULT 0,
  position_y float DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS funnel_edges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id uuid REFERENCES funnels(id) ON DELETE CASCADE,
  source_node_id uuid REFERENCES funnel_nodes(id) ON DELETE CASCADE,
  target_node_id uuid REFERENCES funnel_nodes(id) ON DELETE CASCADE,
  condition_label text,
  condition_value text
);

CREATE TABLE IF NOT EXISTS contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text UNIQUE NOT NULL,
  name text,
  photo_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  last_seen_at timestamptz
);

CREATE TABLE IF NOT EXISTS tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  color text DEFAULT '#E8521A',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text DEFAULT '#888888',
  sort_order int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS contact_pipeline (
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE PRIMARY KEY,
  stage_id uuid REFERENCES pipeline_stages(id),
  funnel_id uuid REFERENCES funnels(id),
  moved_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  funnel_id uuid REFERENCES funnels(id),
  current_node_id uuid REFERENCES funnel_nodes(id),
  status text DEFAULT 'active'
    CHECK (status IN ('active', 'waiting', 'paused', 'completed', 'failed')),
  assigned_to text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id),
  direction text CHECK (direction IN ('inbound', 'outbound')),
  type text CHECK (type IN ('text', 'audio', 'video', 'image', 'document')),
  content text,
  media_url text,
  status text DEFAULT 'sent'
    CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  sent_by text DEFAULT 'auto'
    CHECK (sent_by IN ('auto', 'manual')),
  evolution_message_id text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id),
  contact_id uuid REFERENCES contacts(id),
  node_id uuid REFERENCES funnel_nodes(id),
  type text CHECK (type IN ('text', 'audio', 'video', 'image')),
  content text,
  media_url text,
  scheduled_for timestamptz NOT NULL,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS funnel_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id),
  node_id uuid REFERENCES funnel_nodes(id),
  action text,
  result text,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

INSERT INTO pipeline_stages (name, color, sort_order)
SELECT v.name, v.color, v.sort_order
FROM (VALUES
  ('Novo Lead', '#888888', 0),
  ('Contato feito', '#3B82F6', 1),
  ('Interessado', '#F59E0B', 2),
  ('Proposta', '#8B5CF6', 3),
  ('Convertido', '#10B981', 4),
  ('Perdido', '#EF4444', 5)
) AS v(name, color, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages LIMIT 1);

-- Realtime (ignora se a tabela já estiver na publicação)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

-- RLS (authenticated user full access)
ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'funnels', 'funnel_nodes', 'funnel_edges', 'contacts', 'tags',
    'contact_tags', 'pipeline_stages', 'contact_pipeline', 'conversations',
    'messages', 'message_queue', 'funnel_logs', 'crm_settings'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = 'auth_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY auth_all ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        t
      );
    END IF;
  END LOOP;
END $$;

-- Storage bucket (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('crm-media', 'crm-media', true);
