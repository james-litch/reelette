import {
  MOVIE_SEARCH_MAX_LENGTH,
  MOVIE_SEARCH_MAX_PAGE,
  MOVIE_SEARCH_MIN_LENGTH,
} from "@/lib/movies/types"
import { getUser } from "@/lib/supabase/user"
import { searchMovies } from "@/lib/tmdb/search"

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  })
}

export async function GET(request: Request) {
  try {
    if (!(await getUser())) {
      return json({ error: "Sign in to search for movies." }, 401)
    }

    const params = new URL(request.url).searchParams
    const query = params.get("query")?.trim() ?? ""
    const pageParam = params.get("page") ?? "1"
    const page = Number(pageParam)
    if (!/^[1-9]\d*$/.test(pageParam) || page > MOVIE_SEARCH_MAX_PAGE) {
      return json({ error: "Page must be an integer between 1 and 500." }, 400)
    }
    if (query.length > MOVIE_SEARCH_MAX_LENGTH) {
      return json({ error: "Search must be 200 characters or fewer." }, 400)
    }
    if (query.length < MOVIE_SEARCH_MIN_LENGTH) {
      return json({
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0,
        genres: [],
      })
    }

    if (!process.env.TMDB_ACCESS_TOKEN?.trim()) {
      return json({ error: "Movie search is not configured." }, 503)
    }

    return json(await searchMovies(query, page, request.signal))
  } catch {
    // Do not serialize TMDB errors: they may contain request credentials.
    if (request.signal.aborted) {
      return json({ error: "Search cancelled." }, 499)
    }
    return json({ error: "Could not search movies. Please try again." }, 502)
  }
}
