type Msg = { role: "system" | "user" | "assistant"; content: string };

const URL_OF = () =>
  `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`;

export async function azureChat(
  messages: Msg[],
  opts: { json?: boolean; maxTokens?: number } = {}
): Promise<string> {
  const body: Record<string, unknown> = {
    messages,
    max_completion_tokens: opts.maxTokens ?? 3000,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const r = await fetch(URL_OF(), {
    method: "POST",
    headers: { "api-key": process.env.AZURE_OPENAI_KEY as string, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Azure OpenAI ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}

/** Stream do conteúdo (deltas de texto) via SSE da Azure. */
export async function* azureChatStream(
  messages: Msg[],
  opts: { maxTokens?: number } = {}
): AsyncGenerator<string> {
  const r = await fetch(URL_OF(), {
    method: "POST",
    headers: { "api-key": process.env.AZURE_OPENAI_KEY as string, "Content-Type": "application/json" },
    body: JSON.stringify({ messages, max_completion_tokens: opts.maxTokens ?? 3000, stream: true }),
  });
  if (!r.ok || !r.body) throw new Error(`Azure OpenAI ${r.status}: ${await r.text()}`);

  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const data = t.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const j = JSON.parse(data);
        const delta = j.choices?.[0]?.delta?.content;
        if (delta) yield delta as string;
      } catch {
        /* ignora linhas parciais */
      }
    }
  }
}
