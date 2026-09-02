# Maintaining Documentation

This repository uses Markdown documentation for local developers and AI coding agents.

## Language Policy

- English is the canonical source for documentation.
- Simplified Chinese is a full mirror for users who prefer Chinese.
- Do not mix prose languages inside the same canonical document.
- Do not translate commands, package names, file paths, environment variables, API names, database model names, or code blocks.
- When editing an English document under `docs/en/**`, update the matching `docs/zh-CN/**` document in the same change.
- When a translation cannot be updated immediately, add a visible `Translation status` note at the top of the Chinese document.

## Path Policy

Use mirrored paths:

```text
docs/en/<area>/<name>.md
docs/zh-CN/<area>/<name>.md
```

For directory guides, use:

```text
docs/en/<area>/<name>/README.md
docs/zh-CN/<area>/<name>/README.md
```

Do not add new documentation under non-locale `docs/` subdirectories. New framework documentation belongs under `docs/en/**` with a matching `docs/zh-CN/**` mirror.

## AI Agent Entry Points

- `AGENTS.md` is the English AI agent entry point.
- `AGENTS.zh-CN.md` is the Simplified Chinese mirror.
- Tool-specific files such as `CLAUDE.md` and `.github/copilot-instructions.md` should point agents to `AGENTS.md`.

AI agents should follow the task router in `AGENTS.md`, then read the matching English canonical document. Chinese mirrors are for human review and Chinese-first workflows.

## Review Checklist

Before finishing a documentation change:

- Confirm every English canonical document has a matching Chinese mirror.
- Confirm links in `README.md`, `README.zh-CN.md`, `docs/en/README.md`, and `docs/zh-CN/README.md` point to locale paths.
- Confirm deleted or moved documents are not referenced by AI entry points.
- Run a search for stale non-locale documentation paths before finishing.
