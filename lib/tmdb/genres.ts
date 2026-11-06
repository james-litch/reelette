import "server-only"

import { TMDB, type Genre } from "tmdb-ts"

export async function getMovieGenres(): Promise<Genre[]> {
  const token = process.env.TMDB_ACCESS_TOKEN?.trim()
  if (!token) throw new Error("Movie search is not configured.")

  const tmdb = new TMDB(token, {
    fetch: (url, init) =>
      fetch(url, {
        ...init,
        // Shared reference data must not be cancelled with an individual search.
        signal: AbortSignal.timeout(10_000),
        cache: "force-cache",
        next: { revalidate: 86_400 },
      }),
  })

  const { genres } = await tmdb.genres.movies({ language: "en-US" })
  return genres
}
