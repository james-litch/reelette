"use client"

import { useActionState } from "react"

import { signOut } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
  const [state, action, pending] = useActionState(signOut, null)

  return (
    <form action={action} className="flex flex-col items-start gap-3">
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  )
}
