# AI Chat Examples

This document shows common ways to use the AI Chat module.

## Basic Chat Page

```tsx
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { ChatPanelNew } from "@/modules/ai-chat/components";
import { redirect } from "next/navigation";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const agent = await api.agent.getDefault();

  return (
    <div className="h-screen">
      <ChatPanelNew agentId={agent.id} api="/api/chat" />
    </div>
  );
}
```

## Chat With Product Context

```tsx
export default function ProjectChatPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <ChatPanelNew
      agentId="project-agent"
      api="/api/chat"
      context={{ projectId: params.projectId }}
    />
  );
}
```

## Client-Side Agent Switcher

```tsx
"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { ChatPanelNew } from "@/modules/ai-chat/components";

export function AgentChat() {
  const [agentId, setAgentId] = useState("");
  const { data: agents = [] } = api.agent.list.useQuery();

  return (
    <div>
      <select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </select>

      {agentId ? <ChatPanelNew agentId={agentId} api="/api/chat" /> : null}
    </div>
  );
}
```

## Tool Result Callback

Use callbacks to refresh product UI after a tool completes.

```tsx
<ChatPanelNew
  agentId={agentId}
  api="/api/chat"
  onToolResult={(toolName, result) => {
    if (toolName === "create_document") {
      void refetchDocuments();
    }
  }}
/>
```

## Next Steps

- Read [integration](./INTEGRATION.md).
- Read [plugin development](./PLUGIN_DEV.md).
