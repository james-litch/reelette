"use client"

import { CircleUserRound, Clapperboard } from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"

import { buttonVariants } from "@/components/ui/button"

export function AppHeader({ signedIn }: { signedIn: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <header
      className="border-b bg-background text-foreground"
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          setMenuOpen(false)
          menuButtonRef.current?.focus()
        }
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="flex w-fit items-center gap-3 rounded-sm font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <Clapperboard
            className="size-6 shrink-0"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <span className="text-base whitespace-nowrap sm:text-lg">
            Reelette
          </span>
        </Link>

        {signedIn && (
          <Link
            href="/account"
            aria-label="My account"
            className={buttonVariants({ size: "icon-xs", variant: "ghost" })}
          >
            <CircleUserRound aria-hidden="true" className="size-full stroke-1.5"/>
          </Link>
        )}
      </div>
    </header>
  )
}
