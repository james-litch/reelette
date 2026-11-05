import "server-only"

import { isRoomId } from "@/lib/rooms/types"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/supabase/user"
import type { MovieRequest } from "@/lib/requests/types"

export async function getRequests(roomId: string): Promise<{
  requests: MovieRequest[]
  error: string | null
}> {
  const failure = {
    requests: [],
    error: "We couldn’t load the requests. Please try again.",
  }
  if (!isRoomId(roomId) || !(await getUser())) return failure

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("movie_requests")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })

    return error ? failure : { requests: data, error: null }
  } catch {
    return failure
  }
}
