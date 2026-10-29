// Auth helper for server code: returns the current user and their role (or null), so routes can enforce permissions.
import { supabaseUser } from "./supabaseServer";
import { isRole, type Role } from "@/core/roles";
import { cookies } from "next/headers";

export interface Session {
  userId: string;
  role: Role;
  email?: string;
  isDemo?: boolean;
}

// Reads the verified user from Supabase, then looks up their role in profiles.
// If no active Supabase session or if in demo persona mode, checks demo cookie fallback.
export async function getSession(): Promise<Session | null> {
  const cookieStore = cookies();
  const demoRoleCookie = cookieStore.get("labellens_demo_role")?.value;

  try {
    const sb = supabaseUser();
    const { data: { user } } = await sb.auth.getUser(); // verifies token with Supabase
    if (user) {
      const { data } = await sb.from("profiles").select("role").eq("id", user.id).single();
      if (data && isRole(data.role)) {
        return { userId: user.id, role: data.role, email: user.email, isDemo: false };
      }
    }
  } catch {
    // If Supabase is unconfigured or unreachable, fallback to demo mode
  }

  // Demo Persona fallback
  if (demoRoleCookie && isRole(demoRoleCookie)) {
    return {
      userId: `demo-${demoRoleCookie}-0001`,
      role: demoRoleCookie,
      email: `${demoRoleCookie}@labellens.test`,
      isDemo: true,
    };
  }

  return null;
}
