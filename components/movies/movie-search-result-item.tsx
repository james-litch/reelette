import type { Genre, Movie } from "tmdb-ts"

import { MoviePoster } from "@/components/movies/movie-poster"
import { Badge } from "@/components/ui/badge"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"

export function MovieSearchResultItem({
  movie,
  genres,
}: {
  movie: Movie
  genres: Genre[]
}) {
  const year = movie.release_date?.match(/^\d{4}/)?.[0]
  const movieGenres = genres.filter((genre) =>
    movie.genre_ids?.includes(genre.id)
  )

  return (
    <Item role="listitem" variant="outline" className="items-start">
      <ItemMedia>
        <MoviePoster path={movie.poster_path} title={movie.title} />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-1">
        <ItemTitle className="line-clamp-none">
          <h3 className="wrap-anywhere sm:text-lg">
            {movie.title}{" "}
            <span className="font-normal text-muted-foreground">
              ({year ?? "TBA"})
            </span>
          </h3>
        </ItemTitle>
        <div className="flex flex-wrap gap-1.5 empty:hidden">
          {movieGenres.length > 0 &&
            movieGenres.map((genre) => (
              <Badge key={genre.id} variant="secondary">
                {genre.name}
              </Badge>
            ))}
        </div>
        {movie.overview && (
          <ItemDescription className="text-xs mt-1">
            {movie.overview}
          </ItemDescription>
        )}
      </ItemContent>
    </Item>
  )
}
