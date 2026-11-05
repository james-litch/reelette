import { notFound, redirect } from "next/navigation"
import { Clapperboard } from "lucide-react"

import { RoomSwitcher } from "@/components/rooms/room-switcher"
import { RoomsLoadError } from "@/components/rooms/rooms-load-error"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { getRoom, getRooms } from "@/lib/rooms/queries"
import { getUser } from "@/lib/supabase/user"

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const user = await getUser()
  if (!user) redirect("/#sign-in")

  const { roomId } = await params
  const [{ room, error }, roomList] = await Promise.all([
    getRoom(roomId),
    getRooms(),
  ])

  if (!error && !room) notFound()

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {error || !room ? (
        <RoomsLoadError href={`/rooms/${roomId}`} />
      ) : (
        <>
          <RoomSwitcher
            key={room.id}
            room={room}
            rooms={roomList.error ? [room] : roomList.rooms}
          />

          {roomList.error && <RoomsLoadError href={`/rooms/${room.id}`} />}
          <Empty className="min-h-80 border mt-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Clapperboard aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Ready for movie night</EmptyTitle>
              <EmptyDescription>
                Your room is ready. Use the room name above to switch rooms or
                create another one.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </>
      )}
    </main>
  )
}
