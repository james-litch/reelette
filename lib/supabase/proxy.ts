import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { getSupabaseConfig } from "@/lib/supabase/config"

export async function updateSession(request: NextRequest) {
  const config = getSupabaseConfig()
  let response = NextResponse.next({ request })

  if (!config) return response

  response.headers.set("Cache-Control", "private, no-store")

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value)
        })
        response.headers.set("Cache-Control", "private, no-store")
      },
    },
  })

  // Refresh before Server Components read the session. Keep the response
  // carrying the new cookies so the browser receives the refreshed tokens.
  await supabase.auth.getClaims()

  return response
}
