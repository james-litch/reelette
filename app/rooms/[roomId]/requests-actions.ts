"use server"

import { revalidatePath } from "next/cache"

import { isRoomId } from "@/lib/rooms/types"
import {
  REQUESTOR_NAME_MAX_LENGTH,
  type CreateRequestState,
} from "@/lib/requests/types"
import { createClient } from "@/lib/supabase/server"
import { getMovie } from "@/lib/tmdb/movie"

export async function getRequestors(roomId: string): Promise<{
  names: string[]
  error?: string
}> {
  const failure = {
    names: [],
    error:
      "Previous requestor names couldn’t be loaded. You can still enter a name.",
  }
  if (typeof roomId !== "string" || !isRoomId(roomId)) return failure

  try {
    const supabase = await createClient({ canWriteCookies: true })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return failure

    const { data, error } = await supabase.rpc("get_room_requestors", {
      room_id: roomId,
    })
    return error ? failure : { names: data.map(({ name }) => name) }
  } catch {
    return failure
  }
}

export async function createRequest(
  roomId: string,
  movieId: number,
  _previousState: CreateRequestState,
  formData: FormData
): Promise<CreateRequestState> {
  const failure = { error: "We couldn’t save your request. Please try again." }
  if (
    typeof roomId !== "string" ||
    !isRoomId(roomId) ||
    !Number.isSafeInteger(movieId) ||
    movieId < 1 ||
    movieId > 2_147_483_647
  )
    return failure

  const value = formData.get("requestor")
  const requestor = typeof value === "string" ? value.trim() : ""
  if (!requestor) return { requestorError: "Enter a requestor name." }
  if (Array.from(requestor).length > REQUESTOR_NAME_MAX_LENGTH) {
    return {
      requestorError: `Use ${REQUESTOR_NAME_MAX_LENGTH} characters or fewer.`,
    }
  }

  try {
    const supabase = await createClient({ canWriteCookies: true })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user)
      return { error: "Please sign in before adding a request." }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id")
      .eq("id", roomId)
      .eq("owner_id", user.id)
      .maybeSingle()
    if (roomError || !room) return { error: "This room is unavailable." }

    // Resolve movie details on the server instead of trusting submitted metadata.
    const movie = await getMovie(movieId)
    const year = movie.release_date?.match(/^\d{4}/)?.[0]
    const { error } = await supabase.from("movie_requests").insert({
      room_id: roomId,
      tmdb_id: movieId,
      title: movie.title,
      poster_path: movie.poster_path || null,
      genres: movie.genres.map(({ name }) => name),
      release_year: year ? Number(year) : null,
      requestor_name: requestor,
    })
    if (error) return failure
  } catch {
    return failure
  }

  revalidatePath(`/rooms/${roomId}`)
  return { success: true }
}
