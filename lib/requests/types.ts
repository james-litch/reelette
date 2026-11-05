import type { Tables } from "@/lib/supabase/database.types"

export const REQUESTOR_NAME_MAX_LENGTH = 80

export type MovieRequest = Tables<"movie_requests">

export type RequestActionResult =
  { success: true; error?: never } | { error: string }

export type CreateRequestState = {
  error?: string
  requestorError?: string
  success?: boolean
}
