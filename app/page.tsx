import Link from "next/link"

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { MoviePosters } from "@/components/home/movie-posters"
import { CreateRoomDialog } from "@/components/rooms/create-room-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { getUser } from "@/lib/supabase/user"
import { cn } from "@/lib/utils"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>
}) {
  const [user, params] = await Promise.all([getUser(), searchParams])

  return (
    <main className="flex min-h-[calc(100svh-4rem)] flex-col items-center overflow-hidden px-6 pt-12 sm:pt-20 lg:pt-24">
      <section
        aria-labelledby="home-heading"
        className="flex w-full max-w-3xl flex-col items-center text-center"
      >
        <h1
          id="home-heading"
          className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl"
        >
          Reelette
        </h1>

        <p className="mt-5 max-w-md text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          Create a room, add requests, and decide what to watch together.
        </p>

        {user ? (
          <div className="mt-8 flex w-full max-w-xs items-stretch gap-3 max-sm:flex-col sm:max-w-sm">
            <CreateRoomDialog
              trigger={
                <Button size="lg" className="grow">
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  Create Room
                </Button>
              }
            />
            <Link
              href="/rooms"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "grow"
              )}
            >
              My Rooms
            </Link>
          </div>
        ) : (
          <GoogleSignInButton
            callbackError={params.auth_error === "callback"}
          />
        )}

        <MoviePosters />
      </section>
    </main>
  )
}
