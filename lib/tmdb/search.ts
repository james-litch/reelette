import "server-only"

import { TMDB } from "tmdb-ts"

import type { MovieSearchResponse } from "@/lib/movies/types"
import { getMovieGenres } from "@/lib/tmdb/genres"

export async function searchMovies(
  query: string,
  page: number,
  signal: AbortSignal
): Promise<MovieSearchResponse> {
  const token = process.env.TMDB_ACCESS_TOKEN?.trim()
  if (!token) throw new Error("Movie search is not configured.")

  // Forward cancellation to TMDB and bound how long an upstream request can run.
  const upstreamSignal = AbortSignal.any([signal, AbortSignal.timeout(10_000)])
  const tmdb = new TMDB(token, {
    fetch: (url, init) =>
      fetch(url, { ...init, signal: upstreamSignal, cache: "no-store" }),
  })

  const [movies, genres] = await Promise.all([
    tmdb.search.movies({
      query,
      page,
      include_adult: false,
      language: "en-US",
    }),
    getMovieGenres(),
  ])

  return { ...movies, genres }
}
