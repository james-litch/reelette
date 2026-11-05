import "server-only"

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/supabase/user"
import { isRoomId, type Room } from "@/lib/rooms/types"

const loadError = "We couldn’t load your rooms. Please try again shortly."

export const getRooms = cache(
  async (): Promise<{ rooms: Room[]; error: string | null }> => {
    const user = await getUser()
    if (!user) return { rooms: [], error: "Sign in to view your rooms." }

    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, created_at, exclude_last_requestor, owner_id")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })

      return error
        ? { rooms: [], error: loadError }
        : { rooms: data, error: null }
    } catch {
      return { rooms: [], error: loadError }
    }
  }
)

export const getRoom = cache(
  async (id: string): Promise<{ room: Room | null; error: string | null }> => {
    if (!isRoomId(id)) return { room: null, error: null }

    const user = await getUser()
    if (!user) return { room: null, error: null }

    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, created_at, exclude_last_requestor, owner_id")
        .eq("id", id)
        .maybeSingle()

      return error
        ? { room: null, error: loadError }
        : { room: data, error: null }
    } catch {
      return { room: null, error: loadError }
    }
  }
)
