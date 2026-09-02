# AI Chat Plugin Development

Plugins extend AI Chat with product-specific tools and optional UI renderers.

## Tool Design

A tool should:

- Have a clear name and description.
- Validate parameters with Zod.
- Use services for business logic and ownership checks.
- Return structured data that the UI can render.
- Avoid direct access to unrelated modules.

## Basic Tool

```ts
import { tool } from "ai";
import { z } from "zod";

export const listDocumentsTool = tool({
  description: "List documents in the current project",
  parameters: z.object({
    projectId: z.string().min(1),
  }),
  execute: async ({ projectId }) => {
    return { documents: await documentService.list(projectId) };
  },
});
```

## Tool Sets

Group related tools by product capability. Keep factories small and pass only the context required by the tool.

## UI Renderers

Register a renderer when a tool returns structured data that needs custom UI. Renderers should handle loading, success, and error states.

## Async Work

Use queues for long-running or retryable work:

- File processing.
- External provider calls.
- Large AI generation tasks.
- Side effects that must survive request failure.

Read `docs/en/integrations/queue/README.md` before adding queue-backed tools.

## Best Practices

- Validate every tool parameter.
- Keep tool output serializable.
- Do not expose secrets or internal IDs that the user should not see.
- Enforce ownership in services.
- Log tool failures with enough context for debugging.
