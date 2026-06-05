import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const session = await verifyToken(req.cookies.get("relue_session")?.value);
  if (session) return NextResponse.next();

  // API protegida → 401; páginas → redireciona pro login
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return new NextResponse("Não autenticado", { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  // protege tudo, menos: login, /api/auth/*, estáticos do next, favicon e o geojson público
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico|br-states.json).*)"],
};
