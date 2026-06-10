// Sessão assinada (HMAC-SHA256) — usa Web Crypto, funciona no Edge (middleware) e no Node.
const enc = new TextEncoder();
const SECRET = () => process.env.AUTH_SECRET || "dev-insecure-change-me";

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(str: string): Uint8Array {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function hmacKey() {
  return crypto.subtle.importKey("raw", enc.encode(SECRET()) as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signToken(email: string, nome = "", days = 7): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ e: email, n: nome, x: Date.now() + days * 86400000 })));
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(payload) as BufferSource)
  );
  return payload + "." + b64url(sig);
}

export async function verifyToken(token: string | undefined): Promise<{ email: string; nome: string } | null> {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      fromB64url(sig) as BufferSource,
      enc.encode(payload) as BufferSource
    );
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (!data?.x || data.x < Date.now()) return null;
    return { email: data.e, nome: data.n || "" };
  } catch {
    return null;
  }
}
