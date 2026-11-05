import "server-only"

import { cache } from "react"

import { getSupabaseConfig } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"

export const getUser = cache(async () => {
  if (!getSupabaseConfig()) return null

  const supabase = await createClient()
  // Verify against Supabase Auth; never authorize using getSession().
  const { data, error } = await supabase.auth.getUser()

  return error ? null : data.user
})
