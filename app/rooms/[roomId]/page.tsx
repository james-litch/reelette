import { Clapperboard } from "lucide-react"
import Link from "next/link"

import { MovieRequests } from "@/components/requests/movie-requests"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import { getRandomSelection, getRequests } from "@/lib/requests/queries"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default async function RoomRequestsPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params
  const [{ requests, error }, randomSelection] = await Promise.all([
    getRequests(roomId),
    getRandomSelection(roomId),
  ])

  if (error)
    return (
      <Alert variant="destructive">
        <AlertTitle>Requests unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )

  if (requests.length > 0)
    return (
      <MovieRequests
        key={roomId}
        requests={requests}
        excludedRequestor={randomSelection.excludedRequestor}
        randomError={randomSelection.error}
      />
    )

  return (
    <Empty className="min-h-80 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Clapperboard aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No requests yet</EmptyTitle>
        <EmptyDescription>
          Search for a movie and add your first request.
        </EmptyDescription>

        <Link
          href={`/rooms/${roomId}/search`}
          className={buttonVariants({ size: "lg" })}
        >
          Find a movie
        </Link>
      </EmptyHeader>
    </Empty>
  )
}
