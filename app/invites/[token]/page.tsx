import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { JoinRoomForm } from "./join-room-form"
import { isRoomId } from "@/lib/rooms/types"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/supabase/user"

export const metadata: Metadata = {
  title: "Room invite | Reelette",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ auth_error?: string }>
}) {
  const { token } = await params
  if (!isRoomId(token)) notFound()
  const [user, query] = await Promise.all([getUser(), searchParams])
  let roomName: string | null = null
  let loadFailed = false
  if (user) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .rpc("get_room_invite", { invite_token: token })
        .maybeSingle()
      loadFailed = Boolean(error)
      roomName = data?.room_name ?? null
    } catch {
      loadFailed = true
    }
  }
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-6 px-6 py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight">
        {roomName ? `Join ${roomName}` : "You’re invited to a movie room"}
      </h1>
      {!user ? (
        <>
          <p className="text-muted-foreground">
            Sign in to view your invitation and join the room.
          </p>
          <GoogleSignInButton
            inviteToken={token}
            callbackError={query.auth_error === "callback"}
          />
        </>
      ) : loadFailed ? (
        <>
          <p role="alert" className="text-muted-foreground">
            We couldn’t load this invitation. Please try again.
          </p>
          <Link
            href={`/invites/${token}`}
            className="underline underline-offset-4"
          >
            Try again
          </Link>
        </>
      ) : roomName ? (
        <>
          <p className="text-muted-foreground">
            Add movies, manage requests, pick what to watch, and change the room
            name together.
          </p>
          <JoinRoomForm token={token} />
        </>
      ) : (
        <>
          <p role="alert" className="text-muted-foreground">
            This invite has expired or been replaced, or the room was deleted.
            Ask the owner for a new link.
          </p>
          <Link href="/rooms" className="underline underline-offset-4">
            My Rooms
          </Link>
        </>
      )}
    </main>
  )
}
