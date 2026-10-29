// Server Supabase clients: one acting as the signed-in user (RLS applies) and one with the service role (server-only, after authorization).
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Creates a client bound to the request's session cookies, so every query runs as the logged-in user under RLS.
export function supabaseUser() {
  const store = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      // Cookie writes can fail inside Server Components; middleware refreshes the session, so ignoring is safe.
      setAll: (list: { name: string; value: string; options?: CookieOptions }[]) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
}

// Creates a privileged client that bypasses RLS. NEVER import this from client code; use only after checking permissions.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
