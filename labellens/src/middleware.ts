// Middleware: refreshes the Supabase session cookie on each request, supports demo mode, and redirects signed-out visitors to /login.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isRole } from "@/core/roles";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const isLogin = req.nextUrl.pathname.startsWith("/login");
  const isApi = req.nextUrl.pathname.startsWith("/api");

  // Check for 1-click Demo Persona cookie
  const demoRoleCookie = req.cookies.get("labellens_demo_role")?.value;
  const hasValidDemoRole = demoRoleCookie && isRole(demoRoleCookie);

  if (hasValidDemoRole && isLogin) {
    // If demo mode is active and user hits /login, redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let hasAuthUser = false;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes("YOUR-PROJECT")) {
    try {
      const sb = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (list: { name: string; value: string; options?: CookieOptions }[]) => {
            list.forEach(({ name, value }) => req.cookies.set(name, value));
            res = NextResponse.next({ request: req });
            list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
          },
        },
      });
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        hasAuthUser = true;
      }
    } catch {
      // Supabase connection error fallback
    }
  }

  const isSupabaseConfigured =
    supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes("YOUR-PROJECT") &&
    !supabaseUrl.includes("placeholder");

  // In demo / unconfigured mode without Supabase, allow access to all app routes
  if (!isSupabaseConfigured) {
    return res;
  }

  // Allow through if authenticated or in demo role or accessing public/login/api
  if (!hasAuthUser && !hasValidDemoRole && !isLogin && !isApi) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

// Skip static assets so the middleware only runs on pages and API routes.
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
