import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Corre antes de cada página. Dos trabajos:
// 1. Renovar la sesión de Supabase (cookies).
// 2. Mandar a /login a quien no esté autenticado (y sacarte de /login si ya entraste).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() valida el token contra Supabase. No usar getSession() acá:
  // solo lee la cookie y no garantiza que sea válida.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = request.nextUrl.pathname === "/login";
  const target = !user && !isLogin ? "/login" : user && isLogin ? "/" : null;

  if (target) {
    const redirect = NextResponse.redirect(new URL(target, request.url));
    // Conservar las cookies renovadas en la redirección.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}

export const config = {
  // Se excluyen los archivos que el navegador pide sin sesión (manifiesto e íconos de la app instalable).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/ingest|manifest.webmanifest|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
