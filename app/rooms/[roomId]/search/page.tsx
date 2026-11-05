import { Search } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function RoomSearchPage() {
  return (
    <Empty className="min-h-80 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Search aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Search movies</EmptyTitle>
        <EmptyDescription>
          Movie search for this room will be available here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
