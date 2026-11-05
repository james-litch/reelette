import { History } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function RoomHistoryPage() {
  return (
    <Empty className="min-h-80 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <History aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No watched movies yet</EmptyTitle>
        <EmptyDescription>
          Movies marked as watched in this room will appear here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
