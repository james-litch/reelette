"use client"

import { Check, ChevronDown, Plus } from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"

import { CreateRoomDialog } from "@/components/rooms/create-room-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Room } from "@/lib/rooms/types"

export function RoomSwitcher({ room, rooms }: { room: Room; rooms: Room[] }) {
  const [createOpen, setCreateOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <h1 className="sr-only">{room.name}</h1>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              ref={triggerRef}
              variant="ghost"
              className="w-fit min-w-0 justify-start text-lg"
            />
          }
          aria-label={`${room.name}, switch rooms`}
        >
          <span className="truncate">{room.name}</span>
          <ChevronDown data-icon="inline-end" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="max-w-[calc(100vw-2rem)] min-w-60"
          finalFocus={createOpen ? false : undefined}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>My Rooms</DropdownMenuLabel>
            {rooms.map((item) => (
              <DropdownMenuItem
                key={item.id}
                render={<Link href={`/rooms/${item.id}`} />}
                aria-current={item.id === room.id ? "page" : undefined}
              >
                <span className="truncate">{item.name}</span>
                {item.id === room.id && (
                  <Check className="ml-auto" aria-hidden="true" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" />
              Create a room
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateRoomDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        returnFocusRef={triggerRef}
      />
    </>
  )
}
