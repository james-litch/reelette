import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { getSupabaseConfig } from "@/lib/supabase/config"
import type { Database } from "@/lib/supabase/database.types"

export async function createClient({
  canWriteCookies = false,
}: {
  canWriteCookies?: boolean
} = {}) {
  const config = getSupabaseConfig()

  if (!config) throw new Error("Supabase environment variables are missing.")

  const cookieStore = await cookies()

  return createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        // Proxy persists refreshes during read-only Server Component rendering.
        if (!canWriteCookies) return

        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })
}
