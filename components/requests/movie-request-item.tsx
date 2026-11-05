import { MoviePoster } from "@/components/movies/movie-poster"
import { Badge } from "@/components/ui/badge"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import type { MovieRequest } from "@/lib/requests/types"

export function MovieRequestItem({ request }: { request: MovieRequest }) {
  return (
    <Item role="listitem" variant="outline" className="items-start">
      <ItemMedia>
        <MoviePoster path={request.poster_path} title={request.title} />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-2">
        <ItemTitle className="line-clamp-none">
          <h3 className="wrap-anywhere sm:text-lg">
            {request.title}{" "}
            <span className="font-normal text-muted-foreground">
              ({request.release_year ?? "TBA"})
            </span>
          </h3>
        </ItemTitle>
        <div className="flex flex-wrap gap-1.5 empty:hidden">
          {request.genres.map((genre) => (
            <Badge key={genre} variant="secondary">
              {genre}
            </Badge>
          ))}
        </div>
        <ItemDescription>Requested by {request.requestor_name}</ItemDescription>
      </ItemContent>
    </Item>
  )
}
