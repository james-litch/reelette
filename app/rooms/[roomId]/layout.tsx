import type { ReactNode } from "react"
import { notFound, redirect } from "next/navigation"

import { RoomSwitcher } from "@/components/rooms/room-switcher"
import { RoomSettingsDialog } from "@/components/rooms/room-settings-dialog"
import { RoomTabs } from "@/components/rooms/room-tabs"
import { RoomsLoadError } from "@/components/rooms/rooms-load-error"
import { getRoom, getRooms } from "@/lib/rooms/queries"
import { getUser } from "@/lib/supabase/user"

export default async function RoomLayout({
  children,
  params,
}: {
  children: ReactNode
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
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      {error || !room ? (
        <RoomsLoadError href={`/rooms/${roomId}`} />
      ) : (
        <>
          <div
            key={room.id}
            className="flex min-w-0 items-center justify-between gap-3"
          >
            <RoomSwitcher
              room={room}
              rooms={roomList.error ? [room] : roomList.rooms}
            />
            <RoomSettingsDialog
              room={room}
              isOwner={room.owner_id === user.id}
            />
          </div>
          {roomList.error && <RoomsLoadError href={`/rooms/${room.id}`} />}
          <RoomTabs roomId={room.id}>{children}</RoomTabs>
        </>
      )}
    </main>
  )
}
