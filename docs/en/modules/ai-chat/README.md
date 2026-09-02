# AI Chat Module

**Language:** English | [Simplified Chinese](../../../zh-CN/modules/ai-chat/README.md)

The AI Chat module is the reusable chat foundation for products built on Velobase Harness. It combines a streaming chat API, persisted conversation history, agent configuration, tool execution, and React UI components.

Use it when a product needs in-app AI assistance, workflow agents, document-aware chat, generation tools, or a product-specific assistant that can call business tools.

## Capabilities

- Streaming chat responses through `POST /api/chat` and the Vercel AI SDK.
- Persistent conversations with interaction-based storage for user messages, AI responses, tool calls, reasoning parts, attachments, and related events.
- Agent configuration for model, instructions, enabled tool sets, system presets, and user-installed agents.
- Product tool extension through `toolRegistry`, tool factories, and per-request `ToolContext`.
- Custom tool result UI through `registerToolRenderer`.
- Guest chat support with rate limits and a default guest agent.
- Shared conversation viewing with read-only protection for non-owners.
- File attachment processing before messages are projected into the model context.
- End-to-end typed application APIs through tRPC routers and shared TypeScript types.

## Runtime Flow

```text
ChatPanel
  -> useChat(DefaultChatTransport)
  -> POST /api/chat
  -> authenticate and verify conversation access
  -> load user or guest agent configuration
  -> prepare enabled tools from toolRegistry
  -> build interaction-backed message history
  -> process attachments and project messages for the model
  -> stream the model response and persist interactions
```

The module is enabled by `MODULES.features.aiChat`. `AI_CHAT_MODE=auto` requires at least one supported provider key, such as `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, or `OPENAI_API_KEY`. Use `AI_CHAT_MODE=off` to disable it, or `AI_CHAT_MODE=on` to fail startup when no provider key is configured.

## Data Model

Core records live in `prisma/schema.prisma`:

- `Conversation` is the chat session container. Its `metadata` field can carry product context such as project, tenant, or workflow identifiers.
- `Interaction` is the event-style record for messages and model output. It stores Vercel AI SDK `UIMessage` parts, metadata, parent-child relationships, active branches, and optional `UserAgent` references.
- `Agent` stores reusable model instructions, model name, enabled tool sets, avatar, color, and system preset status.
- `UserAgent` connects a user to an `Agent`, stores default/enabled state, and allows user-specific custom instructions or model overrides.

Seed scripts in `prisma/seed-default-assistant-agent.ts` and `prisma/seed-agent-apps.ts` create the default assistant and system agent presets.

## Agent And Tool Extension

An agent controls which tools are available for a chat run through its `tools` list. Each entry resolves to a registered tool set in `toolRegistry`.

Built-in tools are registered from `src/server/api/tools`. Product modules can add their own tool sets when they need the assistant to read or mutate product data. Tool implementations should validate parameters with Zod, call business services for ownership checks, and return serializable structured data.

For custom UI, register a renderer with `registerToolRenderer(toolName, Renderer)` from a client component or provider. The default renderer still handles unregistered tool results.

## UI Entry Points

- `ChatPanel` renders the chat experience and talks to `/api/chat`.
- `useConversation` creates or loads conversation state.
- Message blocks render text, reasoning, files, and tool parts.
- Tool renderers can be registered from `src/modules/ai-chat/setup-renderers.ts` or a product-specific client entry.

## Extension Rules

- Put product-specific behavior in `src/modules/<name>/` and expose it to chat through tool sets.
- Keep the AI Chat module generic; do not hide product policy inside shared chat services.
- Long-running, retryable, or provider-heavy work should go through BullMQ queues. Read `docs/en/integrations/queue/README.md` before adding queue-backed tools.
- Enforce user ownership in services, not only inside prompts or UI.
- Keep tool outputs serializable and avoid returning secrets or internal-only identifiers.

## Related Guides

- Local module README: `src/modules/ai-chat/README.md`
- Integration steps: `src/modules/ai-chat/config/INTEGRATION.md`
- Plugin development: `src/modules/ai-chat/config/PLUGIN_DEV.md`
- Examples: `src/modules/ai-chat/config/EXAMPLES.md`
- API conventions: `docs/en/conventions/api.md`
- Queue integration: `docs/en/integrations/queue/README.md`
