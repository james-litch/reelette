import type { Genre, Movie } from "tmdb-ts"
import { Plus } from "lucide-react"

import { MoviePoster } from "@/components/movies/movie-poster"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"

export function MovieSearchResultItem({
  movie,
  genres,
  onAdd,
}: {
  movie: Movie
  genres: Genre[]
  onAdd: (trigger: HTMLButtonElement) => void
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
          <ItemDescription className="mt-1 text-xs">
            {movie.overview}
          </ItemDescription>
        )}
      </ItemContent>
      <ItemActions>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Add ${movie.title} to requests`}
          onClick={(event) => onAdd(event.currentTarget)}
        >
          <Plus aria-hidden="true" />
        </Button>
      </ItemActions>
    </Item>
  )
}
