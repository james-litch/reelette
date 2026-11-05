"use client"

import { Shuffle } from "lucide-react"
import { useId, useRef, useState } from "react"

import { CheckboxFilter } from "@/components/ui/checkbox-filter"
import { MovieRequestItem } from "@/components/requests/movie-request-item"
import { RandomMovieDialog } from "@/components/requests/random-movie-dialog"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { FieldGroup } from "@/components/ui/field"
import { ItemGroup } from "@/components/ui/item"
import type { MovieRequest } from "@/lib/requests/types"

function filterOptions(values: string[]) {
  const names = new Map<string, string>()
  for (const value of values) {
    const label = value.trim()
    if (label && !names.has(label.toLowerCase())) {
      names.set(label.toLowerCase(), label)
    }
  }
  return Array.from(names, ([value, label]) => ({ value, label })).sort(
    (a, b) => a.label.localeCompare(b.label)
  )
}

export function MovieRequests({
  requests,
  excludedRequestor = null,
  randomError = null,
}: {
  requests: MovieRequest[]
  excludedRequestor?: string | null
  randomError?: string | null
}) {
  const id = useId()
  const randomButtonRef = useRef<HTMLButtonElement>(null)
  const [selectedRequestors, setSelectedRequestors] = useState<string[]>([])
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const requestors = filterOptions(
    requests.map((request) => request.requestor_name)
  )
  const genres = filterOptions(requests.flatMap((request) => request.genres))
  // A saved filter may disappear when its last request is watched or deleted.
  const activeRequestors = selectedRequestors.filter((name) =>
    requestors.some(({ value }) => value === name)
  )
  const activeGenres = selectedGenres.filter((name) =>
    genres.some(({ value }) => value === name)
  )
  const filtered = requests.filter(
    (request) =>
      (!activeRequestors.length ||
        activeRequestors.includes(
          request.requestor_name.trim().toLowerCase()
        )) &&
      (!activeGenres.length ||
        request.genres.some((name) =>
          activeGenres.includes(name.trim().toLowerCase())
        ))
  )
  const eligible = randomError
    ? []
    : filtered.filter(
        (request) =>
          request.requestor_name.trim().toLowerCase() !==
          excludedRequestor?.trim().toLowerCase()
      )
  const selected = eligible.find((request) => request.id === selectedId)
  const alternatives = selected
    ? eligible.filter((request) => request.tmdb_id !== selected.tmdb_id)
    : eligible

  function pickMovie() {
    if (!alternatives.length) return
    setSelectedId(
      alternatives[Math.floor(Math.random() * alternatives.length)].id
    )
  }

  function clearFilters() {
    setSelectedRequestors([])
    setSelectedGenres([])
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <FieldGroup className="grid w-full min-w-0 grid-cols-2 gap-3 sm:w-96 sm:max-w-full">
          <CheckboxFilter
            id={`${id}-requestor`}
            label="Filter by requestor"
            noun="requestors"
            options={requestors}
            selected={activeRequestors}
            onChange={setSelectedRequestors}
          />
          <CheckboxFilter
            id={`${id}-genre`}
            label="Filter by genre"
            noun="genres"
            options={genres}
            selected={activeGenres}
            onChange={setSelectedGenres}
          />
        </FieldGroup>
        <Button
          ref={randomButtonRef}
          className="w-full sm:ml-auto sm:w-auto"
          disabled={!eligible.length}
          aria-describedby={
            randomError || excludedRequestor
              ? `${id}-random-description`
              : undefined
          }
          onClick={pickMovie}
        >
          <Shuffle data-icon="inline-start" aria-hidden="true" />
          Randomise movie
        </Button>
      </div>
      {(randomError || excludedRequestor) && (
        <p
          id={`${id}-random-description`}
          role="status"
          className="text-sm text-muted-foreground"
        >
          {randomError ||
            (eligible.length
              ? `Random selection excludes ${excludedRequestor}, whose movie was last watched.`
              : `No movies are eligible for random selection with the current filters and the exclusion of ${excludedRequestor}. Change the filters or turn off “Exclude last requestor” in room settings.`)}
        </p>
      )}
      {filtered.length ? (
        <ItemGroup
          aria-label="Movie requests"
          className="grid grid-cols-2 items-start sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
          {filtered.map((request) => (
            <MovieRequestItem key={request.id} request={request} />
          ))}
        </ItemGroup>
      ) : (
        <Empty className="min-h-80 border">
          <EmptyHeader>
            <EmptyTitle>No matching requests</EmptyTitle>
            <EmptyDescription>
              Try a different requestor or genre to find a movie.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        </Empty>
      )}
      {selected && (
        <RandomMovieDialog
          request={selected}
          canPickAgain={alternatives.length > 0}
          onPickAgain={pickMovie}
          onClose={() => setSelectedId(null)}
          returnFocusRef={randomButtonRef}
        />
      )}
    </div>
  )
}
