import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr"

const mocks = vi.hoisted(() => ({
  auth: {
    exchangeCodeForSession: vi.fn(),
    getClaims: vi.fn(),
    getUser: vi.fn(),
    signOut: vi.fn(),
  },
  createClient: vi.fn(),
  cookieGet: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }))
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }))
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookieGet }),
}))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))

import { GET } from "@/app/auth/callback/route"
import { signOut } from "@/app/auth/actions"
import AccountPage from "@/app/account/page"
import { updateSession } from "@/lib/supabase/proxy"
import { getUser } from "@/lib/supabase/user"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.cookieGet.mockReturnValue(undefined)
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
  mocks.createClient.mockResolvedValue({ auth: mocks.auth })
  mocks.auth.exchangeCodeForSession.mockResolvedValue({ error: null })
  mocks.auth.getClaims.mockResolvedValue({ data: null, error: null })
  mocks.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
  mocks.auth.signOut.mockResolvedValue({ error: null })
})

describe("OAuth callback", () => {
  it("returns to the remembered invite after sign-in and clears the continuation cookie", async () => {
    const token = "11111111-1111-4111-8111-111111111111"
    mocks.cookieGet.mockReturnValue({ value: token })
    const response = await GET(
      new Request("https://reelette.example/auth/callback?code=valid-code")
    )
    expect(response.headers.get("location")).toBe(
      `https://reelette.example/invites/${token}`
    )
    expect(response.headers.get("set-cookie")).toContain(
      "reelette-room-invite=;"
    )
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0")
  })
  it("keeps a cancelled invite sign-in on the invite page for retry", async () => {
    const token = "11111111-1111-4111-8111-111111111111"
    mocks.cookieGet.mockReturnValue({ value: token })
    const response = await GET(
      new Request("https://reelette.example/auth/callback?error=access_denied")
    )
    expect(response.headers.get("location")).toBe(
      `https://reelette.example/invites/${token}?auth_error=callback#sign-in`
    )
  })
  it.each([
    "https://evil.example",
    "//evil.example",
    "../account",
    "bad-token",
  ])("rejects untrusted cookie destinations (%s)", async (value) => {
    mocks.cookieGet.mockReturnValue({ value })
    const response = await GET(
      new Request("https://reelette.example/auth/callback?code=valid-code")
    )
    expect(response.headers.get("location")).toBe(
      "https://reelette.example/rooms"
    )
  })
  it("exchanges the code and uses a fixed local destination", async () => {
    const response = await GET(
      new Request(
        "https://reelette.example/auth/callback?code=valid-code&next=https://evil.example"
      )
    )

    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledWith("valid-code")
    expect(mocks.createClient).toHaveBeenCalledWith({ canWriteCookies: true })
    expect(response.headers.get("location")).toBe(
      "https://reelette.example/rooms"
    )
    expect(response.headers.get("cache-control")).toContain("no-store")
  })

  it.each(["", "?error=access_denied", "?code=unused&error=access_denied"])(
    "handles a missing or cancelled sign-in (%s)",
    async (query) => {
      const response = await GET(
        new Request(`https://reelette.example/auth/callback${query}`)
      )

      expect(mocks.auth.exchangeCodeForSession).not.toHaveBeenCalled()
      expect(response.headers.get("location")).toBe(
        "https://reelette.example/?auth_error=callback#sign-in"
      )
    }
  )

  it("handles an expired or invalid code", async () => {
    mocks.auth.exchangeCodeForSession.mockResolvedValueOnce({
      error: new Error("expired"),
    })
    const response = await GET(
      new Request("https://reelette.example/auth/callback?code=expired")
    )

    expect(response.headers.get("location")).toContain("auth_error=callback")
  })

  it("handles a network failure during exchange", async () => {
    mocks.auth.exchangeCodeForSession.mockRejectedValueOnce(
      new Error("network")
    )
    const response = await GET(
      new Request("https://reelette.example/auth/callback?code=valid")
    )

    expect(response.headers.get("location")).toContain("auth_error=callback")
  })

  it("handles missing project configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    const response = await GET(
      new Request("https://reelette.example/auth/callback?code=valid")
    )

    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(response.headers.get("location")).toContain("auth_error=callback")
  })
})

describe("session refresh", () => {
  it("passes refreshed cookies to both server rendering and the browser", async () => {
    const request = new NextRequest("https://reelette.example/account", {
      headers: { cookie: "sb-session=old-token" },
    })
    let cookieMethods: CookieMethodsServer
    vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
      cookieMethods = options.cookies as CookieMethodsServer
      return { auth: mocks.auth } as never
    })
    mocks.auth.getClaims.mockImplementationOnce(async () => {
      expect(cookieMethods.getAll()).toContainEqual({
        name: "sb-session",
        value: "old-token",
      })
      await cookieMethods.setAll!(
        [
          {
            name: "sb-session",
            value: "fresh-token",
            options: { path: "/", sameSite: "lax" },
          },
        ],
        {
          "Cache-Control": "private, no-store",
          Pragma: "no-cache",
          Expires: "0",
        }
      )
      return { data: {}, error: null }
    })

    const response = await updateSession(request)

    expect(mocks.auth.getClaims).toHaveBeenCalledOnce()
    expect(request.cookies.get("sb-session")?.value).toBe("fresh-token")
    expect(response.cookies.get("sb-session")?.value).toBe("fresh-token")
    expect(response.headers.get("x-middleware-request-cookie")).toContain(
      "fresh-token"
    )
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(response.headers.get("pragma")).toBe("no-cache")
    expect(response.headers.get("expires")).toBe("0")
  })

  it("allows the public site to render without configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    const response = await updateSession(
      new NextRequest("https://reelette.example/")
    )

    expect(createServerClient).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
  })
})

describe("account access", () => {
  it("redirects an unauthenticated visitor to sign-in", async () => {
    await expect(AccountPage()).rejects.toThrow("redirect:/#sign-in")
  })

  it("rejects a user when Supabase verification fails", async () => {
    mocks.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "unverified" } },
      error: new Error("invalid token"),
    })

    expect(await getUser()).toBeNull()
  })

  it("renders the account for a verified user", async () => {
    mocks.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "verified", email: "user@example.com" } },
      error: null,
    })

    expect(await AccountPage()).toBeTruthy()
    expect(mocks.auth.getUser).toHaveBeenCalledOnce()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})

describe("sign out", () => {
  it("ends this browser's session, invalidates layouts, and redirects home", async () => {
    await expect(signOut()).rejects.toThrow("redirect:/")

    expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: "local" })
    expect(mocks.createClient).toHaveBeenCalledWith({ canWriteCookies: true })
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it("keeps the user on the page with an error when sign-out fails", async () => {
    mocks.auth.signOut.mockResolvedValueOnce({ error: new Error("network") })

    expect(await signOut()).toEqual({ error: expect.any(String) })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
