"use server"

import { cookies } from "next/headers"

import { ROOM_INVITE_COOKIE } from "@/lib/rooms/invites"
import { isRoomId } from "@/lib/rooms/types"

// Keep OAuth's configured callback URL unchanged. Only a validated invite ID
// can be remembered, never an arbitrary return URL.
export async function rememberRoomInvite(token: string | null) {
  if (token !== null && (typeof token !== "string" || !isRoomId(token))) {
    throw new Error("Invalid room invite")
  }
  const store = await cookies()
  store.set(ROOM_INVITE_COOKIE, token ?? "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/callback",
    maxAge: token ? 600 : 0,
  })
}
