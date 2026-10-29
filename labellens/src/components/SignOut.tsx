"use client";
// Sign-out button: ends the Supabase session and returns to the login page.
import { supabaseBrowser } from "@/lib/supabaseBrowser";
export default function SignOut() {
  return <button className="secondary" onClick={async () => { await supabaseBrowser().auth.signOut(); window.location.href = "/login"; }}>Sign out</button>;
}
