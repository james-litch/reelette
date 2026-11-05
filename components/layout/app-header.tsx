import { Clapperboard } from "lucide-react"
import Link from "next/link"

import { SignOutButton } from "@/components/auth/sign-out-button"

export function AppHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="border-b bg-background text-foreground">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
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

        {signedIn && <SignOutButton />}
      </div>
    </header>
  )
}
