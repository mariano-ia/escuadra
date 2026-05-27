import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// En Next 16 el middleware se llama "proxy". Acá refrescamos la sesión de Supabase
// (optimistic) y bloqueamos rutas privadas. La autorización real se reverifica en cada
// página/route server-side (getUser) — ver skill escuadra-tenant-isolation.

const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/accept-invite",
  "/r/", // informes públicos
  "/privacidad", // política de privacidad (pública)
  "/terminos", // términos y condiciones (públicos)
  "/api/", // webhooks, jobs, oauth callbacks
];

function isPublic(path: string): boolean {
  if (path === "/") return true;
  return PUBLIC_PREFIXES.some((p) => path === p.replace(/\/$/, "") || path.startsWith(p));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && !isPublic(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
