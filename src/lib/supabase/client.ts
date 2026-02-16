import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Returns a singleton Supabase browser client.
 * Prevents multiple WebSocket connections from being created
 * when components re-render (which caused the
 * "WebSocket is closed before the connection is established" error).
 */
export function createClient() {
  if (client) return client;
  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  return client;
}
