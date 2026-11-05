"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { isRoomId, type RoomMember } from "@/lib/rooms/types"
import { createClient } from "@/lib/supabase/server"

export async function createRoomInvite(roomId: string): Promise<{
  token?: string
  expiresAt?: string
  error?: string
}> {
  const failure = {
    error: "We couldn’t create an invite link. Please try again.",
  }
  if (typeof roomId !== "string" || !isRoomId(roomId)) return failure
  try {
    const supabase = await createClient({ canWriteCookies: true })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Please sign in to invite people." }
    // The function verifies ownership and rotates the link atomically.
    const { data, error } = await supabase
      .rpc("create_room_invite", { room_id: roomId })
      .single()
    if (error || !data) return failure
    return { token: data.token, expiresAt: data.expires_at }
  } catch {
    return failure
  }
}

export async function getRoomMembers(roomId: string): Promise<{
  members: RoomMember[]
  error?: string
}> {
  const failure = {
    members: [],
    error: "We couldn’t load the members. Please try again.",
  }
  if (typeof roomId !== "string" || !isRoomId(roomId)) return failure
  try {
    const supabase = await createClient({ canWriteCookies: true })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return failure
    const { data, error } = await supabase.rpc("get_room_members", {
      room_id: roomId,
    })
    if (error || !data) return failure
    return {
      members: data.map((member) => {
        const [firstName, ...remainingNames] = member.name.trim().split(/\s+/)
        const lastName = remainingNames.at(-1)
        return {
          ...member,
          name: lastName
            ? `${firstName} ${Array.from(lastName)[0].toUpperCase()}.`
            : firstName || "Member",
        }
      }),
    }
  } catch {
    return failure
  }
}

export async function removeRoomMember(
  roomId: string,
  memberId: string
): Promise<{ success?: boolean; error?: string }> {
  const failure = {
    error: "We couldn’t remove this member. Please try again.",
  }
  if (
    typeof roomId !== "string" ||
    !isRoomId(roomId) ||
    typeof memberId !== "string" ||
    !isRoomId(memberId)
  )
    return failure
  try {
    const supabase = await createClient({ canWriteCookies: true })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user)
      return { error: "Please sign in to remove members." }
    // Ownership and owner protection are enforced by the database function.
    const { data, error } = await supabase.rpc("remove_room_member", {
      room_id: roomId,
      member_id: memberId,
    })
    if (error || data !== true) return failure
  } catch {
    return failure
  }
  revalidatePath("/rooms", "layout")
  return { success: true }
}

export async function acceptRoomInvite(
  token: string
): Promise<{ error?: string }> {
  const failure = {
    error:
      "This invite is unavailable or expired. Ask the owner for a new link.",
  }
  if (typeof token !== "string" || !isRoomId(token)) return failure
  let roomId: string
  try {
    const supabase = await createClient({ canWriteCookies: true })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user)
      return { error: "Please sign in to join this room." }
    const { data, error } = await supabase.rpc("accept_room_invite", {
      invite_token: token,
    })
    if (error || !data || !isRoomId(data)) return failure
    roomId = data
  } catch {
    return { error: "We couldn’t join the room. Please try again." }
  }
  revalidatePath("/rooms", "layout")
  redirect(`/rooms/${roomId}`)
}
