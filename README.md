# Vyria CRM

Automação de funil de vendas via WhatsApp — interface visual estilo canvas, inbox em tempo real e integração com Evolution API.

## Stack

- Next.js 15 (App Router) + TypeScript
- Supabase (auth + database + storage + realtime)
- Evolution API (WhatsApp)
- React Flow (editor de funis)
- @dnd-kit (pipeline Kanban)

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Copie `.env.example` para `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EVOLUTION_API_BASE_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=
CRM_WEBHOOK_SECRET=vyria-crm-2026
CRON_SECRET=seu-secret-cron
```

### 3. Banco de dados (Supabase)

Execute o SQL em `supabase/migrations/001_crm_schema.sql` no SQL Editor do Supabase.

Crie o bucket de storage `crm-media` (público) no painel Storage.

Crie um usuário em Authentication para login interno.

### 4. Webhook Evolution API

Configure na instância:

- URL: `https://seu-dominio.vercel.app/api/crm/webhooks/whatsapp`
- Header: `x-webhook-secret: vyria-crm-2026`
- Eventos: `MESSAGES_UPSERT`, `CONNECTION_UPDATE`

### 5. Desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000` → login → `/crm/inbox`.

## Rotas

| Rota | Descrição |
|------|-----------|
| `/crm/inbox` | Caixa de entrada |
| `/crm/contacts` | Contatos |
| `/crm/pipeline` | Kanban |
| `/crm/funnels` | Lista de funis |
| `/crm/funnels/[id]` | Editor visual |
| `/crm/tags` | Tags |
| `/crm/settings` | Configurações |

## Deploy (Vercel)

O cron em `vercel.json` processa a fila de mensagens **1x por dia** às 09:00 UTC (`0 9 * * *`), compatível com o plano **Hobby**.

No plano **Pro**, você pode usar agendamento mais frequente (ex.: `*/5 * * * *` a cada 5 minutos).

Defina `CRON_SECRET` na Vercel. O endpoint `/api/crm/queue/process` aceita o header `Authorization: Bearer <CRON_SECRET>` (usado pelo cron da Vercel automaticamente).
