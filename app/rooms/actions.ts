"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { ROOM_NAME_MAX_LENGTH, type CreateRoomState } from "@/lib/rooms/types"
import { createClient } from "@/lib/supabase/server"

export async function createRoom(
  _previousState: CreateRoomState,
  formData: FormData
): Promise<CreateRoomState> {
  let roomId: string

  try {
    const supabase = await createClient({ canWriteCookies: true })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user)
      return { error: "Please sign in before creating a room." }

    const value = formData.get("name")
    const name = typeof value === "string" ? value.trim() : ""

    if (!name) return { nameError: "Enter a room name." }
    if (Array.from(name).length > ROOM_NAME_MAX_LENGTH) {
      return { nameError: `Use ${ROOM_NAME_MAX_LENGTH} characters or fewer.` }
    }

    // Ownership always comes from the verified session, never from form data.
    const { data, error } = await supabase
      .from("rooms")
      .insert({ name, owner_id: user.id })
      .select("id")
      .single()

    if (error || !data)
      return { error: "We couldn’t create your room. Please try again." }

    roomId = data.id
  } catch {
    return { error: "We couldn’t create your room. Please try again." }
  }

  revalidatePath("/rooms")
  revalidatePath("/rooms/[roomId]", "page")
  redirect(`/rooms/${roomId}`)
}
