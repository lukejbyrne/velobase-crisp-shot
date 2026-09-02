# Product Modules

**Language:** English | [Simplified Chinese](../../zh-CN/modules/README.md)

Product modules live under `src/modules/<name>/`. They are the right place for product-specific behavior, reusable UI, product services, and module-local docs.

## Modules

| Module | Purpose |
| --- | --- |
| [AI Chat](./ai-chat/README.md) | Streaming chat, agent configuration, tool execution, and chat UI foundations |
| [Example module](../../../src/modules/example/README.md) | Reference layout for adding product-specific modules |

## Rules

- Keep framework-wide services in `src/server/**`.
- Keep product behavior in `src/modules/<name>/`.
- Use module docs for local implementation details and `docs/en/modules/**` for framework-facing module capabilities.
