type Msg = { role: "system" | "user" | "assistant"; content: string };

const URL_OF = () =>
  `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`;

const TIMEOUT_MS = 28000;

export async function azureChat(
  messages: Msg[],
  opts: { json?: boolean; maxTokens?: number; timeoutMs?: number } = {}
): Promise<string> {
  const body: Record<string, unknown> = {
    messages,
    max_completion_tokens: opts.maxTokens ?? 3000,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), opts.timeoutMs ?? TIMEOUT_MS);
  let r: Response;
  try {
    r = await fetch(URL_OF(), {
      method: "POST",
      headers: { "api-key": process.env.AZURE_OPENAI_KEY as string, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
  } catch (e) {
    throw new Error((e as Error).name === "AbortError" ? "Azure timeout" : (e as Error).message);
  } finally {
    clearTimeout(t);
  }
  if (!r.ok) throw new Error(`Azure OpenAI ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}

/** Stream do conteúdo (deltas de texto) via SSE da Azure. */
export async function* azureChatStream(
  messages: Msg[],
  opts: { maxTokens?: number; timeoutMs?: number } = {}
): AsyncGenerator<string> {
  const ac = new AbortController();
  // timeout até começar a responder; é renovado a cada chunk recebido
  let t = setTimeout(() => ac.abort(), opts.timeoutMs ?? TIMEOUT_MS);
  let r: Response;
  try {
    r = await fetch(URL_OF(), {
      method: "POST",
      headers: { "api-key": process.env.AZURE_OPENAI_KEY as string, "Content-Type": "application/json" },
      body: JSON.stringify({ messages, max_completion_tokens: opts.maxTokens ?? 3000, stream: true }),
      signal: ac.signal,
    });
  } catch (e) {
    clearTimeout(t);
    throw new Error((e as Error).name === "AbortError" ? "Azure timeout" : (e as Error).message);
  }
  if (!r.ok || !r.body) {
    clearTimeout(t);
    throw new Error(`Azure OpenAI ${r.status}: ${await r.text()}`);
  }

  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    clearTimeout(t);
    if (done) break;
    t = setTimeout(() => ac.abort(), 12000); // renova janela entre chunks
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
