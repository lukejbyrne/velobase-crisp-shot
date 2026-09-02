# AI Chat Module

AI Chat is a modular chat system built with tRPC, Prisma, and Vercel AI SDK. It supports agent configuration, tool registration, streaming responses, and interaction history.

For the framework-facing capability guide, read [`docs/en/modules/ai-chat/README.md`](../../../docs/en/modules/ai-chat/README.md) or [`docs/zh-CN/modules/ai-chat/README.md`](../../../docs/zh-CN/modules/ai-chat/README.md).

## Features

- Complete chat flow with message history and streaming responses.
- Agent management with system presets and user-defined agents.
- Tool registry for product-specific tools.
- Interaction-based storage for user messages, AI responses, and tool calls.
- End-to-end type safety through tRPC.
- React 19 and Tailwind CSS UI components.

## Stack

- Frontend: React 19, Next.js 15, Tailwind CSS.
- Backend: Next.js API Routes, tRPC v11.
- Database: Prisma and PostgreSQL.
- AI SDK: Vercel AI SDK.
- State: TanStack Query.

## Quick Start

Read [the framework guide](../../../docs/en/modules/ai-chat/README.md), then follow [the integration guide](./config/INTEGRATION.md).

## Structure

```text
src/modules/ai-chat/
├── database/
├── server/
│   ├── api/
│   ├── services/
│   └── lib/
├── components/
├── types/
└── config/
```

## Concepts

### Conversation And Interaction

`Conversation` is the session container. `Interaction` records user messages, AI responses, tool calls, and related events.

### Agent

An agent stores model, instruction, and tool configuration. Agents can be system presets or user-defined records.

### Tool Registry

The tool registry provides extension points. The module owns registry and types; host products register business tools.

## Documentation

- [Framework capability guide](../../../docs/en/modules/ai-chat/README.md)
- [中文能力说明](../../../docs/zh-CN/modules/ai-chat/README.md)
- [Integration guide](./config/INTEGRATION.md)
- [Plugin development](./config/PLUGIN_DEV.md)
- [Examples](./config/EXAMPLES.md)
