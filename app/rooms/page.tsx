import { redirect } from "next/navigation"
import { Clapperboard, Plus } from "lucide-react"

import { CreateRoomDialog } from "@/components/rooms/create-room-dialog"
import { RoomsLoadError } from "@/components/rooms/rooms-load-error"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { getRooms } from "@/lib/rooms/queries"
import { getUser } from "@/lib/supabase/user"

export default async function RoomsPage() {
  const user = await getUser()
  if (!user) redirect("/#sign-in")

  const { rooms, error } = await getRooms()
  if (!error && rooms.length) redirect(`/rooms/${rooms[0].id}`)

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">My Rooms</h1>
      {error ? (
        <RoomsLoadError href="/rooms" />
      ) : (
        <Empty className="py-15 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Clapperboard aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Your movie night starts here</EmptyTitle>
            <EmptyDescription>
              Create your first room to give your next movie night a home.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreateRoomDialog
              trigger={
                <Button>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  Create Room
                </Button>
              }
            />
          </EmptyContent>
        </Empty>
      )}
    </main>
  )
}
