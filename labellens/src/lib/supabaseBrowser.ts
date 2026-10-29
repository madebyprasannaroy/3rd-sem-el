// Browser Supabase client: used by client components for sign-in and live (realtime) subscriptions. Uses the public anon key only.
import { createBrowserClient } from "@supabase/ssr";

// Creates a Supabase client for the browser; row-level security limits what it can read.
export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  return createBrowserClient(url, key);
}
