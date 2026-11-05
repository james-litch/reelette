import type { Database } from "@/lib/supabase/database.types"

export type Room = Pick<
  Database["public"]["Tables"]["rooms"]["Row"],
  "id" | "name" | "created_at"
>

export type CreateRoomState = {
  error?: string
  nameError?: string
}

export const ROOM_NAME_MAX_LENGTH = 80

export function isRoomId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  )
}
