# 部署到 Velobase Cloud

本文是 Velobase Harness 的中文部署入口。

使用 Velobase Cloud CLI 完成项目初始化、Cloud 适配、部署检查和运维操作。

## 1. 安装 CLI

```bash
npm install -g @velobaseai/cloud-cli@latest
```

CLI 命令是 `velobase-cloud`。

## 2. 登录并连接 GitHub

```bash
velobase-cloud login
velobase-cloud github connect
```

CLI 使用浏览器登录，并把本地凭证保存到 `~/.velobase-cloud/`。

查看项目额度和付费状态：

```bash
velobase-cloud billing
```

Velobase Cloud 使用 project/month 模型。每个初始化后的项目会消耗一个项目额度，并获得独立 PostgreSQL、独立 Redis 和 App 计算资源预算。新账号可用免费试用额度；额度不足时，CLI 会提示进入付费页面购买项目额度。

## 3. 初始化项目

在 Harness 仓库根目录运行：

```bash
velobase-cloud init
```

`init` 会扫描项目、识别 Velobase Harness、消耗一个可用项目额度，创建 Cloud project 和独立基础设施，写入 `.github/workflows/deploy-velobase.yml`、尽可能配置 GitHub secrets，并把项目绑定信息保存到 `.velobase/config.json`。

## 4. 适配 Cloud

- 使用 `pnpm install` 安装依赖。
- 根据 `.env.example` 配置 `.env`。
- 确认 database、Redis、auth 和必需 provider keys 可用。
- 执行 `docs/zh-CN/ai/completion-checklist.md` 中的相关检查。

生成 AI 部署适配上下文：

```bash
velobase-cloud adapt
```

该命令会写入 `.velobase/ai-prompt.md`。在 IDE 中打开它，让本地 AI 按 Cloud 约束调整项目。

## 5. 选择 Runtime Mode

使用 `SERVICE_MODE`：

- `web,worker` 用于默认组合 runtime，不启用可选 API 服务。
- `web` 和 `worker` 用于生产拆分部署。
- `api` 仅在新增真实 Hono routes 且需要独立服务后使用。
- `all` 用于明确希望 Web、API 和 Worker 在同一进程中启动的场景。
- 需要时使用 `web,api` 等逗号分隔组合。

详见 `docs/zh-CN/architecture/web-api-service-split.md`。

## 6. 验证

部署前：

```bash
pnpm lint
pnpm typecheck
pnpm build
```

如果 schema 变更，确认 migrations 已提交，线上使用 `prisma migrate deploy`。

然后运行 CLI readiness check：

```bash
velobase-cloud doctor
```

`doctor` 会检查 Dockerfile、端口 `3000`、health endpoint、migration setup、workflow、secrets 和环境变量校验等部署要求。

## 7. 部署

默认部署路径是 GitHub Actions：

```bash
git push origin main
```

也可以通过 CLI 触发部署：

```bash
velobase-cloud deploy trigger --branch main --watch
```

当前规范化的 GitHub Actions workflow 是 `.github/workflows/deploy-velobase.yml`。它部署默认的 Web + Worker 形态，暴露 `web` 服务，并只保留这个 workflow 监听 `main` 分支的 `push`，避免一次提交触发重复部署。

Deploy API 要求每个服务显式声明 `cpu_request`、`memory_request`、`cpu_limit` 和 `memory_limit`。workflow 会从 `/api/v1/deploy/config` 读取 `appBudget`，将 request 平均分配给 `web` 和 `worker`，并保持每个服务的 limit 与 request 相同。Kubernetes quota 会同时计算 request 和 limit，因此把两个服务的 limit 都设置为完整 App 预算会导致第二个 pod 无法通过 quota admission。

部署 workflow 应在构建镜像前先校验 `/api/v1/deploy/config`。`dataPlaneMode` 必须是 `project`；如果 Deploy API 返回 `PROJECT_DATA_PLANE_REQUIRED`，说明当前 API key 绑定的是 legacy shared project，需要先迁移或重新创建为 project data-plane project，才能继续使用 Deploy API。

拆分 Web + Worker 部署时，Web 监听 `3000`，使用平台 HTTP probe 检查 `/healthz`，并在启动 `server.js` 前执行 `prisma migrate deploy`；Worker 监听 `3001`，使用 `exec` probe，不执行 migrations。只有当其他发布步骤已经完成迁移时，才设置 `SKIP_MIGRATION=true`。

只有在独立 Hono routes 已启用时才增加 API 服务；此时在 services 中加入 `mode: "api"`、`port: 3002` 的 API 条目，并重新把 App 预算分配给 Web、API 和 Worker。除非主域名（`{subdomain}.velobase.app`）确实要直接路由到 API，否则 `exposed_service` 仍保持 `web`。

## 8. 运维

使用 CLI 查看状态、部署记录、日志、环境变量和回滚：

```bash
velobase-cloud status
velobase-cloud deploy runs
velobase-cloud logs deploy
velobase-cloud logs pods
velobase-cloud env list
velobase-cloud billing
velobase-cloud deploy rollback <deployment-id>
```

- 检查 Web `/healthz` 和 Worker 进程日志。Worker 在 Cloud 中使用 `exec` probe；其 `3001` HTTP health server 用于本地诊断和可选直连检查，不作为 Cloud readiness 的主契约。只有启用可选 API 服务时才检查 API health。
- 如果命令返回 `PROJECT_OVERDUE`，先恢复项目订阅，再部署或应用环境变量变更。
- 从日志确认必需模块已初始化。
- 生产问题先收集 Cloud runtime logs，再按 `docs/zh-CN/debugging/online-local-debug.md` 排查。
