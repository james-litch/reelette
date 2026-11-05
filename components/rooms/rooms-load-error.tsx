import Link from "next/link"
import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function RoomsLoadError({ href }: { href: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>Rooms are unavailable</AlertTitle>
      <AlertDescription>
        We couldn’t load your rooms. <Link href={href}>Try again</Link> in a
        moment.
      </AlertDescription>
    </Alert>
  )
}
