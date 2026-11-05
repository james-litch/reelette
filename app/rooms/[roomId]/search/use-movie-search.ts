"use client"

import { useEffect, useRef, useState } from "react"
import type { Genre, Movie } from "tmdb-ts"

import {
  MOVIE_SEARCH_MIN_LENGTH,
  MOVIE_SEARCH_MAX_PAGE,
  type MovieSearchResponse,
} from "@/lib/movies/types"

const initialState = {
  query: "",
  page: 1,
  totalPages: 0,
  totalResults: 0,
  status: "idle" as "idle" | "loading" | "success" | "error",
  results: [] as Movie[],
  genres: [] as Genre[],
  error: null as string | null,
}

export function useMovieSearch() {
  const [state, setState] = useState(initialState)
  const controller = useRef<AbortController | null>(null)
  const { query, page } = state

  useEffect(() => {
    if (query.trim().length < MOVIE_SEARCH_MIN_LENGTH) return

    const current = new AbortController()
    controller.current = current
    const timer = setTimeout(async () => {
      let error = "Could not search movies. Please try again."
      try {
        const response = await fetch(
          `/api/movies/search?${new URLSearchParams({ query: query.trim(), page: String(page) })}`,
          { signal: current.signal, cache: "no-store" }
        )
        if (response.status === 401) {
          error = "Your session has expired. Sign in again to search movies."
        }
        if (!response.ok) throw new Error(error)

        const {
          results,
          genres,
          total_pages,
          total_results,
        }: MovieSearchResponse = await response.json()
        if (!current.signal.aborted) {
          setState((state) => ({
            ...state,
            status: "success",
            results,
            genres,
            totalPages: Math.min(total_pages, MOVIE_SEARCH_MAX_PAGE),
            totalResults: total_results,
          }))
        }
      } catch {
        if (!current.signal.aborted) {
          setState((state) => ({ ...state, status: "error", error }))
        }
      }
    }, 350)

    return () => {
      clearTimeout(timer)
      current.abort()
    }
  }, [query, page])

  function setQuery(query: string) {
    if (query === state.query) return
    // Invalidate the old request before React runs the effect cleanup.
    controller.current?.abort()
    setState({
      ...initialState,
      query,
      status:
        query.trim().length < MOVIE_SEARCH_MIN_LENGTH ? "idle" : "loading",
    })
  }

  function setPage(page: number) {
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > state.totalPages ||
      page === state.page
    )
      return
    controller.current?.abort()
    setState((state) => ({
      ...state,
      page,
      results: [],
      status: "loading",
      error: null,
    }))
  }

  return { ...state, setQuery, setPage }
}
