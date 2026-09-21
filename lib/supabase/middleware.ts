import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isRootEmail } from "@/lib/role";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Refreshes the Supabase session cookies and gates non-public routes
 * to root admins. Call from proxy.ts.
 */
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/.well-known") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    // Sentry's tunnel. It carries error reports out to Sentry and reads
    // nothing here, so gating it would only mean every client-side error is
    // answered with a redirect to /login and never reported.
    pathname.startsWith("/monitoring") ||
    // Static assets only. The previous `/\.[a-z0-9]+$/` treated ANY path
    // ending in a dot-extension as public, which could expose a sensitive
    // route that happens to end that way. Restrict to known asset extensions.
    /\.(?:ico|png|jpe?g|gif|svg|webp|avif|css|js|map|txt|xml|json|woff2?|ttf|eot)$/i.test(
      pathname,
    );

  // Public routes don't need Supabase at all - skip the ~10-400ms auth round-trip
  // on every static/prefetch/login request. The proxy matcher already excludes
  // _next/static etc., but we keep this as a second guard for direct fetches.
  if (isPublicRoute) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY - skipping auth middleware. Create .env.local from .env.example and set values from https://supabase.com/dashboard/project/_/settings/api",
    );
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as CookieOptions);
        });
      },
    },
  });

  // Use getClaims() (local JWT decode) instead of getUser() (remote fetch)
  // per Supabase docs - 0ms vs 100-300ms per navigation, especially cross-region.
  // Falls back to getUser() only if claims are present but we need a full refresh.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as
    | { email?: string; sub?: string; exp?: number }
    | null
    | undefined;
  const email = claims?.email ?? null;
  const sub = claims?.sub ?? null;

  if (!claims || !sub) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!isRootEmail(email)) {
    // Authenticated but not a root admin - sign them out and bounce.
    await supabase.auth.signOut();
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("error", "not-root");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
