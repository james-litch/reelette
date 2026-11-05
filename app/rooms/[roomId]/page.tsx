import { Clapperboard } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function RoomRequestsPage() {
  return (
    <Empty className="min-h-80 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Clapperboard aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No requests yet</EmptyTitle>
        <EmptyDescription>
          Movie requests for this room will appear here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
