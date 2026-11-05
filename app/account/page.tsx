import { redirect } from "next/navigation"

import { SignOutButton } from "@/components/auth/sign-out-button"
import { getUser } from "@/lib/supabase/user"

export default async function AccountPage() {
  const user = await getUser()

  if (!user) redirect("/#sign-in")

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12 lg:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
        <p className="text-muted-foreground">You’re signed in with Google.</p>
      </div>
      <div className="flex flex-col items-start gap-6">
        <dl className="flex flex-col gap-1">
          <dt className="text-sm text-muted-foreground">Email address</dt>
          <dd className="font-medium break-all">{user.email}</dd>
        </dl>
        <SignOutButton />
      </div>
    </main>
  )
}
