import { beforeEach, expect, it, vi } from "vitest"
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr"
import { cookies } from "next/headers"

vi.mock("server-only", () => ({}))
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }))
vi.mock("next/headers", () => ({ cookies: vi.fn() }))

import { createClient } from "@/lib/supabase/server"

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
})

it("persists OAuth session cookies using the supplied cookie options", async () => {
  const store = {
    getAll: vi.fn(() => [{ name: "verifier", value: "pkce" }]),
    set: vi.fn(),
  }
  vi.mocked(cookies).mockResolvedValue(store as never)

  await createClient({ canWriteCookies: true })
  const cookieMethods = vi.mocked(createServerClient).mock.calls[0][2]
    .cookies as CookieMethodsServer
  expect(cookieMethods.getAll()).toEqual([{ name: "verifier", value: "pkce" }])
  await cookieMethods.setAll!(
    [
      {
        name: "sb-session",
        value: "token",
        options: { path: "/", sameSite: "lax", secure: true },
      },
    ],
    {}
  )

  expect(store.set).toHaveBeenCalledWith("sb-session", "token", {
    path: "/",
    sameSite: "lax",
    secure: true,
  })
})

it("allows read-only Server Components to use the client", async () => {
  const set = vi.fn(() => {
    throw new Error("read-only cookies")
  })
  vi.mocked(cookies).mockResolvedValue({
    getAll: vi.fn(() => []),
    set,
  } as never)

  await createClient()
  const cookieMethods = vi.mocked(createServerClient).mock.calls[0][2]
    .cookies as CookieMethodsServer

  expect(() =>
    cookieMethods.setAll!(
      [{ name: "sb-session", value: "token", options: {} }],
      {}
    )
  ).not.toThrow()
  expect(set).not.toHaveBeenCalled()
})

it("propagates cookie write failures in writable contexts", async () => {
  vi.mocked(cookies).mockResolvedValue({
    getAll: vi.fn(() => []),
    set: vi.fn(() => {
      throw new Error("cookie write failed")
    }),
  } as never)

  await createClient({ canWriteCookies: true })
  const cookieMethods = vi.mocked(createServerClient).mock.calls[0][2]
    .cookies as CookieMethodsServer

  expect(() =>
    cookieMethods.setAll!(
      [{ name: "sb-session", value: "token", options: {} }],
      {}
    )
  ).toThrow("cookie write failed")
})
