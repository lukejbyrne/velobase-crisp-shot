# AI Chat 模块

**语言:** [English](../../../en/modules/ai-chat/README.md) | 简体中文

AI Chat 模块是 Velobase Harness 中可复用的聊天底座。它把流式聊天 API、持久化会话历史、Agent 配置、工具调用和 React UI 组件组织在一起，方便产品直接接入 AI 助手能力。

当产品需要站内 AI 助手、工作流 Agent、文档上下文聊天、生成类工具，或需要调用业务工具的产品助手时，可以优先复用这个模块。

## 能力

- 通过 `POST /api/chat` 和 Vercel AI SDK 输出流式聊天响应。
- 持久化会话，使用 `Interaction` 存储用户消息、AI 回复、工具调用、reasoning、附件和相关事件。
- Agent 配置，支持模型、instructions、启用工具集、系统预设和用户已安装 Agent。
- 通过 `toolRegistry`、工具工厂和每次请求的 `ToolContext` 扩展产品工具。
- 通过 `registerToolRenderer` 为工具结果注册自定义 UI。
- 支持访客聊天、限流和默认访客 Agent。
- 支持共享会话查看，并对非拥有者保持只读保护。
- 在消息投影给模型之前处理文件附件。
- 通过 tRPC routers 和共享 TypeScript 类型保持端到端类型安全。

## 运行流程

```text
ChatPanel
  -> useChat(DefaultChatTransport)
  -> POST /api/chat
  -> 认证并校验会话访问权限
  -> 加载用户或访客 Agent 配置
  -> 从 toolRegistry 准备启用的工具
  -> 基于 Interaction 构建消息历史
  -> 处理附件并投影模型上下文
  -> 流式返回模型响应并持久化交互记录
```

模块由 `MODULES.features.aiChat` 控制启用。`AI_CHAT_MODE=auto` 要求至少配置一个支持的模型 provider key，例如 `ANTHROPIC_API_KEY`、`OPENROUTER_API_KEY` 或 `OPENAI_API_KEY`。使用 `AI_CHAT_MODE=off` 可关闭该模块，使用 `AI_CHAT_MODE=on` 可在未配置 provider key 时快速失败。

## 数据模型

核心记录位于 `prisma/schema.prisma`：

- `Conversation` 是聊天会话容器，`metadata` 可以承载项目、租户、工作流等产品上下文。
- `Interaction` 是事件式消息记录，用于存储 Vercel AI SDK `UIMessage` parts、metadata、父子关系、活跃分支，以及可选的 `UserAgent` 引用。
- `Agent` 存储可复用的模型 instructions、模型名称、启用工具集、头像、颜色和系统预设状态。
- `UserAgent` 连接用户和 `Agent`，保存默认状态、启用状态，以及用户级 custom instructions 或模型覆盖配置。

`prisma/seed-default-assistant-agent.ts` 和 `prisma/seed-agent-apps.ts` 会创建默认助手和系统预设 Agent。

## Agent 和工具扩展

Agent 通过自己的 `tools` 列表决定一次聊天运行可以使用哪些工具。每个工具名会解析到 `toolRegistry` 中注册的工具集。

内置工具从 `src/server/api/tools` 注册。产品模块如果需要让助手读取或修改业务数据，应注册自己的工具集。工具实现应使用 Zod 校验参数，通过业务 service 做权限和所有权检查，并返回可序列化的结构化数据。

如果工具结果需要自定义界面，可以在客户端组件或 provider 中调用 `registerToolRenderer(toolName, Renderer)`。未注册的工具结果仍会走默认渲染。

## UI 入口

- `ChatPanel` 渲染聊天体验并请求 `/api/chat`。
- `useConversation` 负责创建或加载会话状态。
- 消息块负责渲染文本、reasoning、文件和工具 parts。
- 工具渲染器可以从 `src/modules/ai-chat/setup-renderers.ts` 或产品自己的客户端入口注册。

## 扩展规则

- 产品特定行为放在 `src/modules/<name>/`，再通过工具集暴露给 AI Chat。
- 保持 AI Chat 模块通用，不要把产品策略隐藏在共享聊天服务里。
- 长耗时、需要重试或重度依赖外部 provider 的工作应走 BullMQ 队列。添加队列型工具前先阅读 `docs/zh-CN/integrations/queue/README.md`。
- 用户所有权校验应放在 service 层，不只依赖 prompt 或 UI。
- 工具返回值保持可序列化，不要返回密钥或仅内部可见的 ID。

## 相关指南

- 模块本地 README：`src/modules/ai-chat/README.md`
- 接入步骤：`src/modules/ai-chat/config/INTEGRATION.md`
- 插件开发：`src/modules/ai-chat/config/PLUGIN_DEV.md`
- 示例：`src/modules/ai-chat/config/EXAMPLES.md`
- API 约定：`docs/zh-CN/conventions/api.md`
- Queue 集成：`docs/zh-CN/integrations/queue/README.md`
