import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

/**
 * Server-only client authenticated with the service role key. There's no
 * per-request user session anymore — the whole app sits behind a single
 * passcode gate (see lib/session.ts + proxy.ts) — so this bypasses RLS
 * entirely and must never be imported into client-side code.
 */
export function createClient() {
  return createSupabaseClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
