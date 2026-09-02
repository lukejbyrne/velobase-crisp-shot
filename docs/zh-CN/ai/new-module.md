# 新业务模块指南

创建 `src/modules/<name>/` 下的产品业务模块时阅读本文档。

如果模块涉及 auth、payment、email、storage、analytics、ads、queue、database 或 security，也要阅读对应的 `docs/zh-CN/integrations/*/README.md`。

## 1. 前置条件

确认：

- 模块名使用 kebab-case。
- 主实体和 owner 已知。
- 所需集成已知。
- 测试覆盖目标已知。

## 2. 标准结构

只创建需要的目录：

```text
src/modules/<name>/
├── README.md
├── server/
│   ├── schema.ts
│   ├── service.ts
│   ├── router.ts
│   └── service.test.ts
├── worker/
│   ├── queue.ts
│   ├── processor.ts
│   └── index.ts
└── components/
    └── <name>-page.tsx
```

规则：

- 业务逻辑放在 `server/service.ts`。
- Router 只做输入校验并调用 service。
- 只有需要异步或可重试工作时才添加 worker 文件。

## 3. Prisma Model

产品实体添加到 `prisma/schema.prisma`。除非用户要求，不要修改框架保留表。

使用 `cuid()`、ownership 字段、timestamps、状态 enum 和 indexes。可提交的 schema 变更需要 migration。

## 4. Zod Schemas

为所有 router input 创建 `server/schema.ts`。不要信任客户端传入的 `userId`，必须从 session 派生。

## 5. Service

创建 `server/service.ts`。

规则：

- Service 负责 ownership 校验。
- 预期业务错误使用 `TRPCError`。
- 计费、队列、存储、邮件和事件都使用框架封装。

## 6. Router

创建 `server/router.ts`，并在 `src/server/api/root.ts` 注册。

规则：

- 读操作是 query。
- 写操作是 mutation。
- mutation 默认 protected，除非明确公开。
- Router body 保持薄层。

## 7. UI

在 `src/app/` 创建 route，并导入模块组件。用户可见文案必须使用 `useTranslations()` 或 `getTranslations()`。

## 8. Workers And Events

Workers：

- 阅读 `docs/zh-CN/integrations/queue/README.md`。
- 从中心 worker indexes 导出 queues 和 processors。
- 使用 `createWorkerInstance()`。
- 确保任务幂等。

Events：

- 通过 `appEvents.emit()` 发送领域事件。
- 添加 event payload types。
- 核心模块代码不要直接调用可插拔模块。

## 9. 测试与完成

写测试前阅读 `docs/zh-CN/ai/testing.md`。

最低要求：

- 用 `server/service.test.ts` 覆盖业务规则。
- 对 ownership、auth 或 persistence 添加 router integration tests。
- Worker job 添加 processor tests。
- E2E 只覆盖关键产品路径。

最终回复前：

- 运行最小相关验证命令。
- 如果 schema 变更，确认 migration 状态。
- 执行 `docs/zh-CN/ai/completion-checklist.md`。
