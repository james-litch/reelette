"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  isRoomId,
  ROOM_NAME_MAX_LENGTH,
  type RoomSettingsState,
} from "@/lib/rooms/types"
import { createClient } from "@/lib/supabase/server"

export async function updateRoomSettings(
  roomId: string,
  formData: FormData
): Promise<RoomSettingsState> {
  const failure = {
    error: "We couldn’t save the room settings. Please try again.",
  }
  if (typeof roomId !== "string" || !isRoomId(roomId)) return failure

  const value = formData.get("name")
  const name = typeof value === "string" ? value.trim() : ""
  if (!name) return { nameError: "Enter a room name." }
  if (Array.from(name).length > ROOM_NAME_MAX_LENGTH) {
    return { nameError: `Use ${ROOM_NAME_MAX_LENGTH} characters or fewer.` }
  }
  const excludeLastRequestor = formData.get("excludeLastRequestor")
  if (excludeLastRequestor !== "true" && excludeLastRequestor !== "false")
    return failure

  try {
    const supabase = await createClient({ canWriteCookies: true })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user)
      return { error: "Please sign in to change room settings." }

    const { data, error } = await supabase
      .from("rooms")
      .update({ name, exclude_last_requestor: excludeLastRequestor === "true" })
      .eq("id", roomId)
      .eq("owner_id", user.id)
      .select("id")
      .maybeSingle()
    if (error || !data) return failure
  } catch {
    return failure
  }

  revalidatePath("/rooms")
  revalidatePath(`/rooms/${roomId}`, "layout")
  return { success: true }
}

export async function deleteRoom(roomId: string): Promise<RoomSettingsState> {
  const failure = { error: "We couldn’t delete this room. Please try again." }
  if (typeof roomId !== "string" || !isRoomId(roomId)) return failure

  try {
    const supabase = await createClient({ canWriteCookies: true })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Please sign in to delete a room." }

    const { data, error } = await supabase
      .from("rooms")
      .delete()
      .eq("id", roomId)
      .eq("owner_id", user.id)
      .select("id")
      .maybeSingle()
    if (error || !data) return failure
  } catch {
    return failure
  }

  revalidatePath("/rooms", "layout")
  redirect("/rooms")
}
