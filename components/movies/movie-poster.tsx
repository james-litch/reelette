"use client"

import { ImageOff } from "lucide-react"
import Image from "next/image"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type PosterSize =
  "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original"

export function MoviePoster({
  path,
  title,
  size = "w185",
  className,
  sizes = "64px",
  children,
}: {
  path: string | null
  title: string
  size?: PosterSize
  className?: string
  sizes?: string
  children?: ReactNode
}) {
  const src = path ? `https://image.tmdb.org/t/p/${size}${path}` : null

  return (
    <div
      className={cn(
        "relative flex aspect-2/3 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground",
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={`${title} poster`}
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <>
          <ImageOff className="size-5" aria-hidden="true" />
          <span className="sr-only">No poster available</span>
        </>
      )}
      {children}
    </div>
  )
}
