import { NextResponse } from "next/server"

import { getSupabaseConfig } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const failureUrl = new URL("/?auth_error=callback#sign-in", url.origin)
  const failureResponse = NextResponse.redirect(failureUrl)
  failureResponse.headers.set("Cache-Control", "private, no-store")

  if (!code || url.searchParams.has("error") || !getSupabaseConfig()) {
    return failureResponse
  }

  try {
    const supabase = await createClient({ canWriteCookies: true })
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) return failureResponse

    const response = NextResponse.redirect(new URL("/rooms", url.origin))
    response.headers.set("Cache-Control", "private, no-store")
    return response
  } catch {
    return failureResponse
  }
}
