# AI Chat Module Integration

Use this guide to wire the AI Chat module into a Next.js + tRPC project.

## Prerequisites

- Next.js 15+
- React 19+
- tRPC v11+
- Prisma
- Vercel AI SDK (`@ai-sdk/react`, `ai`)
- TanStack Query

## 1. Copy The Module

```bash
cp -r src/modules/ai-chat /your-project/src/modules/
```

## 2. Integrate Database Models

Copy the models from `src/modules/ai-chat/database/schema.prisma.example` into `prisma/schema.prisma`.

Add user relations:

```prisma
model User {
  conversations Conversation[]
  agents        Agent[]
}
```

Run a migration:

```bash
pnpm prisma migrate dev --name add_ai_chat_tables
```

Core tables:

- `Conversation`: chat session container; `metadata` can store product context such as `projectId`.
- `Interaction`: event-sourced interaction records using Vercel AI SDK `UIMessage` parts.
- `Agent`: model, instruction, and tool configuration.

## 3. Register tRPC Routers

Mount module routers in `src/server/api/root.ts`:

```ts
import { agentRouter } from "@/modules/ai-chat/server/routers/agent";
import { conversationRouter } from "@/modules/ai-chat/server/routers/conversation";

export const appRouter = createTRPCRouter({
  conversation: conversationRouter,
  agent: agentRouter,
});
```

## 4. Add Chat API Route

```ts
// src/app/api/chat/route.ts
export { POST } from "@/modules/ai-chat/server/api/route";
```

## 5. Use Chat Components

```tsx
import { ChatPanelNew } from "@/modules/ai-chat/components";

export default function ChatPage() {
  return (
    <div className="h-screen">
      <ChatPanelNew agentId="your-agent-id" api="/api/chat" />
    </div>
  );
}
```

## 6. Register Product Tools

Register product-specific tools at application startup. Tools should validate input with Zod and enforce product ownership in service code.

## 7. Configure Environment

Add the LLM provider key your project uses, for example:

```env
OPENROUTER_API_KEY=xxx
DATABASE_URL=xxx
```

Update `src/env.js` and `.env.example` when adding provider settings.

## Next Steps

- Read [plugin development](./PLUGIN_DEV.md).
- Read [examples](./EXAMPLES.md).
- Follow framework API conventions in `docs/en/conventions/api.md`.
