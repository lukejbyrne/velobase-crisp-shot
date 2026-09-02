# AI 开发完成检查清单

完成功能、Bug 修复、重构或集成后，在 commit、push、PR 或部署前使用本文档。

目标不是机械运行所有命令，而是确认本次改动覆盖了正确性、数据库、部署和安全边界。

## 1. 变更范围检查

- 查看 `git diff`。
- 确认没有混入无关文件、临时日志、调试代码或格式化噪音。
- 未经用户明确要求，不回滚用户已有改动。
- 如果修改框架通用层，确认没有把产品特定逻辑写入通用能力。
- 如果新增依赖，确认确实必要且 lockfile 匹配。

## 2. 质量命令

可行时在项目根目录运行：

```bash
pnpm lint
pnpm typecheck
pnpm build
```

如果只改文档，可以跳过 build，但应检查链接和命令示例。

建议补充：

```bash
pnpm format:check
```

如果已有测试或本次新增测试，运行最小相关测试命令。

## 3. Prisma 和数据库

如果修改了 `prisma/schema.prisma`：

- 提交 `prisma/migrations/<timestamp>_<name>/migration.sql`。
- 可部署变更不要只依赖 `pnpm db:push` 或 `npx prisma db push`。
- 运行 `npx prisma generate`，或确认部署流程会重新生成 Prisma Client。
- 必填字段需要确认历史数据迁移安全。
- 手写 migration 尽量幂等。

## 4. 运行时配置

如果环境变量变化：

- 更新 `.env.example`。
- 更新 `src/env.js`；应用代码不要直接读 `process.env`。
- 生产环境缺变量时应尽早失败，或有明确的模块禁用路径。
- 如果 env 控制可插拔模块，在 `src/config/modules.ts` 集中管理启停。
- 确认目标 `SERVICE_MODE`。默认是 `web,worker`；只有真实 Hono routes 需要独立服务时才启用 `api`。

## 5. API 与权限

涉及 tRPC、Hono、Next.js API routes 或 Server Actions 时：

- Mutations 默认使用 `protectedProcedure`，除非明确公开。
- 用户输入用 Zod 或等价 schema 校验。
- 列表查询要分页。
- 错误不泄露密钥、token、连接串或 provider 敏感响应。
- 新 router 已挂载，禁用模块不会暴露 routes。
- 新外部 HTTP 或 webhook endpoint 默认应留在 Web，除非有明确理由启用可选 Hono API 服务。

## 6. 安全与数据边界

高风险区域：

- Auth：不要在 client state 或 local storage 保存敏感 token。
- Payment：前端不直接调用支付 SDK；Webhook 校验签名；权益发放走 fulfillment/billing services。
- File upload：校验文件类型、大小和访问权限；使用 storage abstraction。
- Admin：页面、API 和操作入口都要覆盖权限。
- Logs：不要打印 API keys、sessions、JWTs、卡信息或用户隐私数据。

## 7. 模块与副作用

涉及通知、分析、广告或自动化时：

- 使用 `appEvents.emit()` 和可插拔模块订阅。
- 不在核心流程中直接调用 PostHog、Google Ads、Lark、Telegram 等模块。
- 新事件补充 `EventPayload` 类型。
- 事件处理器异常要记录日志，不应破坏核心业务流程。

## 8. Workers 和队列

涉及后台任务时：

- 新队列从 `src/workers/queues/index.ts` 导出。
- Processor 从 `src/workers/processors/index.ts` 导出。
- Worker 通过 `createWorkerInstance()` 创建。
- Job 必须幂等。
- 重试和永久失败行为可观察。
- `SERVICE_MODE=worker` 不依赖 Next.js-only APIs。

## 9. 前端与国际化

涉及 UI 时：

- 用户可见文案使用 `useTranslations()` 或 `getTranslations()`。
- loading、empty、error、unauthorized 状态可用。
- 表单避免重复提交或显示 loading。
- 窄屏布局基本可用。
- 必要时更新导航和 SEO metadata。

## 10. 文档与种子数据

如果使用方式变化：

- 更新相关 README、集成文档或框架指南。
- 写清新配置、Webhook 和第三方后台步骤。
- 默认数据变化时保持 seed 脚本幂等。
- 示例和命令符合当前项目结构。

## 11. 人工验证

按变更类型至少走一条真实路径：

- 登录/注册/权限：页面或 API。
- 支付/订阅/退款：测试模式完整路径。
- 数据库：migration 和关键查询。
- Worker：入队并执行一个 job。
- Webhook：测试事件或本地转发。

## 12. 提交前

- `git status` 只包含任务相关文件。
- 没有 `.env`、密钥、私有证书、本地数据库文件或临时导出。
- lockfile 变化与依赖变化一致。
- migrations、seeds、docs 和 code 匹配。
- 最终回复说明运行了哪些检查、哪些跳过。
