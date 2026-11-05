import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { getSupabaseConfig } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"
import { ROOM_INVITE_COOKIE } from "@/lib/rooms/invites"
import { isRoomId } from "@/lib/rooms/types"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const remembered = (await cookies()).get(ROOM_INVITE_COOKIE)?.value
  const invitePath =
    remembered && isRoomId(remembered) ? `/invites/${remembered}` : null
  const failureUrl = new URL(
    invitePath
      ? `${invitePath}?auth_error=callback#sign-in`
      : "/?auth_error=callback#sign-in",
    url.origin
  )
  const failureResponse = NextResponse.redirect(failureUrl)
  failureResponse.headers.set("Cache-Control", "private, no-store")
  failureResponse.cookies.set(ROOM_INVITE_COOKIE, "", {
    path: "/auth/callback",
    maxAge: 0,
  })

  if (!code || url.searchParams.has("error") || !getSupabaseConfig()) {
    return failureResponse
  }

  try {
    const supabase = await createClient({ canWriteCookies: true })
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) return failureResponse

    const response = NextResponse.redirect(
      new URL(invitePath ?? "/rooms", url.origin)
    )
    response.headers.set("Cache-Control", "private, no-store")
    response.cookies.set(ROOM_INVITE_COOKIE, "", {
      path: "/auth/callback",
      maxAge: 0,
    })
    return response
  } catch {
    return failureResponse
  }
}
