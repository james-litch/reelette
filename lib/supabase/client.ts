import { createBrowserClient } from "@supabase/ssr"

import { getSupabaseConfig } from "@/lib/supabase/config"
import type { Database } from "@/lib/supabase/database.types"

export function createClient() {
  const config = getSupabaseConfig()

  if (!config) throw new Error("Supabase environment variables are missing.")

  return createBrowserClient<Database>(config.url, config.publishableKey)
}
