import { MoviePosters } from "@/components/home/movie-posters"
import { Button } from "@/components/ui/button"
import IconGoogle from "@/components/ui/icon-google"

export default function Page() {
  return (
    <main className="flex min-h-[calc(100svh-4rem)] flex-col items-center overflow-hidden px-6 pt-12 sm:pt-20 lg:pt-24">
      <section
        aria-labelledby="home-heading"
        className="flex w-full max-w-3xl flex-col items-center text-center"
      >
        <h1
          id="home-heading"
          className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl"
        >
          Reelette
        </h1>

        <p className="mt-5 max-w-md text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          Create a room, add requests, and decide what to watch together.
        </p>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-8 w-full max-w-xs gap-3"
        >
          <IconGoogle />
          Sign in with Google
        </Button>

        <MoviePosters />
      </section>
    </main>
  )
}
