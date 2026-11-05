"use client"

import { AlertCircle, ChevronLeft, ChevronRight, Search } from "lucide-react"

import { MovieSearchResultItem } from "@/components/movies/movie-search-result-item"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ItemGroup } from "@/components/ui/item"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination"
import { MOVIE_SEARCH_MAX_LENGTH } from "@/lib/movies/types"

import { useMovieSearch } from "./use-movie-search"

export default function RoomSearchPage() {
  const { query, setQuery, setPage, ...state } = useMovieSearch()

  return (
    <section
      aria-label="Movie search"
      className="mx-auto flex max-w-xl flex-col gap-6"
    >
      <InputGroup>
        <InputGroupInput
          id="movie-search"
          type="search"
          placeholder="Search..."
          aria-label="Search movies"
          autoComplete="off"
          maxLength={MOVIE_SEARCH_MAX_LENGTH}
          aria-controls="movie-search-results"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end" role="status">
          {state.status === "loading"
            ? "Searching…"
            : `${state.totalResults.toLocaleString()} ${state.totalResults === 1 ? "result" : "results"}`}
        </InputGroupAddon>
      </InputGroup>

      <div id="movie-search-results" aria-busy={state.status === "loading"}>
        {state.status === "error" && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Search unavailable</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {(state.status === "idle" ||
          (state.status === "success" && state.results.length === 0)) && (
          <Empty className="min-h-64 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>
                {state.status === "idle" ? "Find a movie" : "No movies found"}
              </EmptyTitle>
              <EmptyDescription>
                {state.status === "idle"
                  ? "Search for a movie to see its poster, genres, and release year."
                  : "Try another title or check your spelling."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {state.status === "success" && state.results.length > 0 && (
          <ItemGroup aria-label="Movie results">
            {state.results.map((movie) => (
              <MovieSearchResultItem
                key={movie.id}
                movie={movie}
                genres={state.genres}
              />
            ))}
          </ItemGroup>
        )}
      </div>

      {state.totalPages > 1 && (
        <Pagination aria-label="Movie result pages" className="max-w-lg">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                aria-label="Previous page"
                aria-controls="movie-search-results"
                disabled={state.page === 1 || state.status === "loading"}
                onClick={() => setPage(state.page - 1)}
              >
                <ChevronLeft data-icon="inline-start" />
                Previous
              </Button>
            </PaginationItem>
            <PaginationItem>
              <span aria-current="page" className="px-3 text-sm tabular-nums">
                Page {state.page} of {state.totalPages.toLocaleString()}
              </span>
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                aria-label="Next page"
                aria-controls="movie-search-results"
                disabled={
                  state.page >= state.totalPages || state.status === "loading"
                }
                onClick={() => setPage(state.page + 1)}
              >
                Next
                <ChevronRight data-icon="inline-end" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <p className="text-xs text-muted-foreground">
        Movie data and images provided by{" "}
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4"
        >
          TMDB
        </a>
        .
      </p>
    </section>
  )
}
