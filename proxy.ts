import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/env";

/**
 * Refreshes the Supabase auth session cookie on navigation when a backend is
 * configured. It performs no authorisation — that happens in the API routes
 * and in Postgres RLS. In local demo mode it is a no-op.
 */
export async function proxy(request: NextRequest) {
  if (!supabaseConfig) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseConfig.url, supabaseConfig.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|fonts/|icon.svg|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|woff2)$).*)"],
};
