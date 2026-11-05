import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

export default function RoomNotFound() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Room not found</EmptyTitle>
          <EmptyDescription>
            This room doesn’t exist or isn’t available to your account.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/rooms" className={buttonVariants()}>
            My Rooms
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  )
}
