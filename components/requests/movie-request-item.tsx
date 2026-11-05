"use client"

import { Check, EllipsisVertical, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"

import {
  deleteRequest,
  markRequestWatched,
} from "@/app/rooms/[roomId]/requests-actions"
import { MoviePoster } from "@/components/movies/movie-poster"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Item, ItemContent, ItemTitle } from "@/components/ui/item"
import type { MovieRequest, RequestActionResult } from "@/lib/requests/types"

export function MovieRequestItem({ request }: { request: MovieRequest }) {
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function manage(
    action: (roomId: string, requestId: string) => Promise<RequestActionResult>
  ) {
    if (pending) return
    setError(undefined)
    startTransition(async () => {
      try {
        const result = await action(request.room_id, request.id)
        setError(result.error)
      } catch {
        setError("We couldn’t update this request. Please try again.")
      }
    })
  }

  return (
    <Item
      role="listitem"
      className="grid min-w-0 content-start items-stretch gap-2 border-0 p-0"
      aria-busy={pending}
    >
      <MoviePoster
        path={request.poster_path}
        title={request.title}
        size="w342"
        className="w-full"
        sizes="(min-width: 1280px) 220px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
      >
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
          <Badge
            variant="secondary"
            className="min-w-0 shrink"
            title={request.requestor_name}
          >
            <span className="sr-only">Requested by </span>
            <span className="truncate">{request.requestor_name}</span>
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="secondary" size="icon-sm" />}
              disabled={pending}
              aria-label={`Options for ${request.title}`}
            >
              <EllipsisVertical aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                {!request.watched_at && (
                  <DropdownMenuItem
                    onClick={() => manage(markRequestWatched)}
                    disabled={pending}
                  >
                    <Check aria-hidden="true" />
                    Mark as watched
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => manage(deleteRequest)}
                  disabled={pending}
                >
                  <Trash2 aria-hidden="true" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {request.watched_at && (
          <div className="absolute inset-x-0 bottom-0 flex p-2">
            <Badge variant="secondary">
              {new Intl.DateTimeFormat("en-GB", {
                dateStyle: "medium",
                timeZone: "UTC",
              }).format(new Date(request.watched_at))}
            </Badge>
          </div>
        )}
      </MoviePoster>
      <ItemContent className="min-w-0 gap-2">
        <ItemTitle className="w-full min-w-0">
          <h3
            className="line-clamp-1"
            title={`${request.title} (${request.release_year ?? "TBA"})`}
          >
            {request.title}{" "}
            <span className="font-normal text-muted-foreground">
              ({request.release_year ?? "TBA"})
            </span>
          </h3>
        </ItemTitle>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </ItemContent>
    </Item>
  )
}
