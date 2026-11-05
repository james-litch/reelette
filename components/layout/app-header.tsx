"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Clapperboard, Menu, X } from "lucide-react"
import { useRef, useState } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navigation = [
  { label: "Home", href: "/" },
  { label: "Rooms", href: "/rooms" },
]

export function AppHeader() {
  const pathname = usePathname()

  // Reset the mobile disclosure when navigation changes the current page.
  return <HeaderContent key={pathname} pathname={pathname} />
}

function HeaderContent({ pathname }: { pathname: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  function renderLinks(mobile = false) {
    return navigation.map(({ label, href }) => {
      const active =
        pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))

      return (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          onClick={() => setMenuOpen(false)}
          className={cn(
            "border-b-2 border-transparent px-1 py-2 text-sm transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
            active
              ? "border-foreground font-medium text-foreground"
              : "text-muted-foreground",
            mobile && "px-3 py-3"
          )}
        >
          {label}
        </Link>
      )
    })
  }

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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 md:grid md:grid-cols-[1fr_auto_1fr] lg:px-8">
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

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-8 md:flex"
        >
          {renderLinks()}
        </nav>

        <Link
          href="/account"
          className={cn(
            buttonVariants({ size: "sm" }),
            "hidden justify-self-end md:inline-flex"
          )}
        >
          Get Started
        </Link>

        <Button
          ref={menuButtonRef}
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={
            menuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
      </div>

      <nav
        id="mobile-navigation"
        aria-label="Mobile navigation"
        hidden={!menuOpen}
        className="border-t px-4 pb-4 md:hidden"
      >
        <div className="flex flex-col gap-1 py-2">{renderLinks(true)}</div>
        <Link
          href="/account"
          onClick={() => setMenuOpen(false)}
          className={cn(buttonVariants(), "w-full")}
        >
          Get Started
        </Link>
      </nav>
    </header>
  )
}
