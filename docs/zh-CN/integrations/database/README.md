# 数据库集成

数据库集成覆盖 Prisma、PostgreSQL、Redis、migrations 和 seed data。

## 使用

- 使用 `@/server/db` 的 `db`；不要创建新的 PrismaClient。
- 使用 `@/server/redis` 的 `redis`；不要创建临时 Redis 连接。
- 产品实体放在 `prisma/schema.prisma` 和产品模块 services 中。

## 配置

常见环境变量：

- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- Provider 要求时配置 Redis authentication 或 TLS 变量。

配置变化时更新 `.env.example` 和 `src/env.js`。

## Migrations

- 本地实验可以使用 `npx prisma db push`。
- 可提交、可部署变更需要 `prisma/migrations/*`。
- 生产部署使用 `prisma migrate deploy`。
- 必填字段需要为已有数据设计安全迁移方案。
- Seed scripts 应保持幂等。

## AI 规则

- 除非用户明确要求，不修改框架保留表。
- 使用 `cuid()`、ownership 字段、timestamps、有限状态 enums 和 indexes。
- 业务规则放在 services，不放在 Prisma model comments 或 router bodies。
