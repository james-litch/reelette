"use client"

import { useActionState } from "react"
import { LoaderCircle } from "lucide-react"

import { acceptRoomInvite } from "@/app/rooms/[roomId]/invite-actions"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"

export function JoinRoomForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    () => acceptRoomInvite(token),
    {}
  )
  return (
    <form action={action} className="flex flex-col items-center gap-4">
      {state.error && <FieldError>{state.error}</FieldError>}
      <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>
        {pending && (
          <LoaderCircle
            data-icon="inline-start"
            className="animate-spin"
            aria-hidden="true"
          />
        )}
        {pending ? "Joining…" : "Join room"}
      </Button>
    </form>
  )
}
