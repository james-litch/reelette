"use client"

import { Check, ExternalLink, LoaderCircle, Shuffle } from "lucide-react"
import { useState, useTransition, type RefObject } from "react"

import { markRequestWatched } from "@/app/rooms/[roomId]/requests-actions"
import { MoviePoster } from "@/components/movies/movie-poster"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getLetterboxdUrl } from "@/lib/movies/links"
import type { MovieRequest } from "@/lib/requests/types"

export function RandomMovieDialog({
  request,
  canPickAgain,
  onPickAgain,
  onClose,
  returnFocusRef,
}: {
  request: MovieRequest
  canPickAgain: boolean
  onPickAgain: () => void
  onClose: () => void
  returnFocusRef: RefObject<HTMLButtonElement | null>
}) {
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function markWatched() {
    if (pending) return
    setError(undefined)
    startTransition(async () => {
      try {
        const result = await markRequestWatched(request.room_id, request.id)
        if (result.error) setError(result.error)
        else onClose()
      } catch {
        setError("We couldn’t mark this movie as watched. Please try again.")
      }
    })
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <DialogContent finalFocus={returnFocusRef} showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle className="text-xl">Random movie</DialogTitle>
          <DialogDescription>
            {canPickAgain
              ? "A movie from your current filters."
              : "This is the only movie matching your current filters."}
          </DialogDescription>
        </DialogHeader>
        <div
          className="flex flex-col items-center gap-3 text-center"
          aria-live="polite"
        >
          <MoviePoster
            path={request.poster_path}
            title={request.title}
            size="w342"
            className="w-32 sm:w-40"
            sizes="(min-width: 640px) 160px, 128px"
          />
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-lg font-semibold">
              {request.title}{" "}
              <span className="font-normal text-muted-foreground">
                ({request.release_year ?? "TBA"})
              </span>
            </h3>
            <div className="flex flex-wrap justify-center gap-1.5">
              {request.genres.map((genre) => (
                <Badge key={genre} variant="secondary">
                  {genre}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Requested by {request.requestor_name}
            </p>
            <Button
              variant="link"
              size="sm"
              nativeButton={false}
              render={
                <a
                  href={getLetterboxdUrl(request.tmdb_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <ExternalLink data-icon="inline-start" aria-hidden="true" />
              Letterboxd
              <span className="sr-only"> (opens in a new tab)</span>
            </Button>
          </div>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter className="flex-col sm:flex-col">
          <Button disabled={pending} aria-busy={pending} onClick={markWatched}>
            {pending ? (
              <LoaderCircle
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Check data-icon="inline-start" aria-hidden="true" />
            )}
            {pending ? "Saving…" : "Mark as watched"}
          </Button>
          <Button
            variant="outline"
            disabled={pending || !canPickAgain}
            onClick={() => {
              setError(undefined)
              onPickAgain()
            }}
          >
            <Shuffle data-icon="inline-start" aria-hidden="true" />
            Pick again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
