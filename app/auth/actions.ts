"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export async function signOut() {
  try {
    const supabase = await createClient({ canWriteCookies: true })
    const { error } = await supabase.auth.signOut({ scope: "local" })

    if (error) return { error: "We couldn’t sign you out. Please try again." }
  } catch {
    return { error: "We couldn’t sign you out. Please try again." }
  }

  revalidatePath("/", "layout")
  redirect("/")
}
