import { NextResponse, type NextRequest } from "next/server";

// Verificação de sessão inline (sem imports externos — exigência do Edge da Vercel).
// Mantém o mesmo formato/segredo do lib/session.ts (HMAC-SHA256, cookie payload.sig).
const enc = new TextEncoder();
const SECRET = () => process.env.AUTH_SECRET || "dev-insecure-change-me";

function fromB64url(str: string): Uint8Array {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function valid(token: string | undefined): Promise<boolean> {
  if (!token || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(SECRET()) as BufferSource,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const ok = await crypto.subtle.verify("HMAC", key, fromB64url(sig) as BufferSource, enc.encode(payload) as BufferSource);
    if (!ok) return false;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    return !!data?.x && data.x >= Date.now();
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  if (await valid(req.cookies.get("relue_session")?.value)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return new NextResponse("Não autenticado", { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  // exclui login, api/auth, assets do Next e qualquer arquivo estático (com extensão)
  matcher: ["/((?!login|api/auth|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
