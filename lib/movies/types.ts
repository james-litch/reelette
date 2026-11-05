import type { Genre, Movie, Search } from "tmdb-ts"

export const MOVIE_SEARCH_MIN_LENGTH = 2
export const MOVIE_SEARCH_MAX_LENGTH = 200
export const MOVIE_SEARCH_MAX_PAGE = 500

export type MovieSearchResponse = Search<Movie> & {
  genres: Genre[]
}
