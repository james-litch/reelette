import { History } from "lucide-react"

import { MovieRequestItem } from "@/components/requests/movie-request-item"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ItemGroup } from "@/components/ui/item"
import { getRequests } from "@/lib/requests/queries"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default async function RoomHistoryPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params
  const { requests, error } = await getRequests(roomId, true)

  if (error)
    return (
      <Alert variant="destructive">
        <AlertTitle>History unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )

  if (requests.length > 0)
    return (
      <ItemGroup
        aria-label="Watched movies"
        className="grid grid-cols-2 items-start sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      >
        {requests.map((request) => (
          <MovieRequestItem key={request.id} request={request} />
        ))}
      </ItemGroup>
    )

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
