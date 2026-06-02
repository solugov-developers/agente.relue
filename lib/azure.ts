type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function azureChat(
  messages: Msg[],
  opts: { json?: boolean; maxTokens?: number } = {}
): Promise<string> {
  const url = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`;
  const body: Record<string, unknown> = {
    messages,
    max_completion_tokens: opts.maxTokens ?? 3000,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "api-key": process.env.AZURE_OPENAI_KEY as string,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Azure OpenAI ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}
