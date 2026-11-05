"use client"

import { useState } from "react"
import { LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import IconGoogle from "@/components/ui/icon-google"
import { createClient } from "@/lib/supabase/client"

export function GoogleSignInButton({
  callbackError = false,
}: {
  callbackError?: boolean
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(
    callbackError ? "Sign-in wasn’t completed. Please try again." : null
  )

  async function signIn() {
    setPending(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch {
      setError("We couldn’t connect to Google. Please try again shortly.")
      setPending(false)
    }
  }

  return (
    <div
      id="sign-in"
      className="mt-8 flex w-full max-w-xs scroll-mt-8 flex-col gap-3"
    >
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full gap-3"
        disabled={pending}
        aria-busy={pending}
        aria-describedby={error ? "sign-in-error" : undefined}
        onClick={signIn}
      >
        {pending ? (
          <LoaderCircle
            data-icon="inline-start"
            className="animate-spin"
            aria-hidden="true"
          />
        ) : (
          <IconGoogle />
        )}
        {pending ? "Connecting to Google…" : "Sign in with Google"}
      </Button>
      {error && (
        <p id="sign-in-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
