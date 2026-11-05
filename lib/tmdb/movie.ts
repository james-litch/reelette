import "server-only"

import { TMDB } from "tmdb-ts"

export async function getMovie(movieId: number) {
  const token = process.env.TMDB_ACCESS_TOKEN?.trim()
  if (!token) throw new Error("Movie data is not configured.")

  const tmdb = new TMDB(token, {
    fetch: (url, init) =>
      fetch(url, {
        ...init,
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      }),
  })

  return tmdb.movies.details(movieId, undefined, "en-US")
}
