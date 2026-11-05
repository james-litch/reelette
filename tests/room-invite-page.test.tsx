// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
  rpc: vi.fn(),
  maybeSingle: vi.fn(),
}))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/user", () => ({ getUser: mocks.getUser }))
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found")
  },
}))
vi.mock("@/components/auth/google-sign-in-button", () => ({
  GoogleSignInButton: ({
    inviteToken,
    callbackError,
  }: {
    inviteToken?: string
    callbackError?: boolean
  }) => (
    <button data-invite={inviteToken}>
      {callbackError ? "Retry sign-in" : "Sign in with Google"}
    </button>
  ),
}))
vi.mock("@/app/invites/[token]/join-room-form", () => ({
  JoinRoomForm: ({ token }: { token: string }) => (
    <button data-invite={token}>Join room</button>
  ),
}))
import InvitePage from "@/app/invites/[token]/page"

const token = "11111111-1111-4111-8111-111111111111"
function page(auth_error?: string) {
  return InvitePage({
    params: Promise.resolve({ token }),
    searchParams: Promise.resolve({ auth_error }),
  })
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.getUser.mockResolvedValue({ id: "member" })
  mocks.createClient.mockResolvedValue({ rpc: mocks.rpc })
  mocks.rpc.mockReturnValue({ maybeSingle: mocks.maybeSingle })
  mocks.maybeSingle.mockResolvedValue({
    data: { room_name: "Friday" },
    error: null,
  })
})
afterEach(cleanup)

describe("invite landing page", () => {
  it("preserves a signed-out user's invitation through sign-in without disclosing room details", async () => {
    mocks.getUser.mockResolvedValue(null)
    render(await page())
    expect(
      screen
        .getByRole("button", { name: "Sign in with Google" })
        .getAttribute("data-invite")
    ).toBe(token)
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: "Join room" })).toBeNull()
  })
  it("allows retry of a failed Google sign-in from the same invite", async () => {
    mocks.getUser.mockResolvedValue(null)
    render(await page("callback"))
    expect(
      screen
        .getByRole("button", { name: "Retry sign-in" })
        .getAttribute("data-invite")
    ).toBe(token)
  })
  it("shows a room preview and explicit join button without accepting on GET", async () => {
    render(await page())
    expect(screen.getByRole("heading", { name: "Join Friday" })).toBeDefined()
    expect(
      screen
        .getByRole("button", { name: "Join room" })
        .getAttribute("data-invite")
    ).toBe(token)
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("get_room_invite", {
      invite_token: token,
    })
  })
  it("handles expired, replaced, or deleted invitations", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    render(await page())
    expect(screen.getByRole("alert").textContent).toContain(
      "Ask the owner for a new link"
    )
    expect(screen.queryByRole("button", { name: "Join room" })).toBeNull()
  })
  it("provides retry on a database failure without calling it an expired invite", async () => {
    mocks.maybeSingle.mockRejectedValue(new Error("network"))
    render(await page())
    expect(screen.getByRole("alert").textContent).toContain("couldn’t load")
    expect(
      screen.getByRole("link", { name: "Try again" }).getAttribute("href")
    ).toBe(`/invites/${token}`)
  })
  it("rejects malformed tokens before looking up the user or database", async () => {
    await expect(
      InvitePage({
        params: Promise.resolve({ token: "bad" }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("not found")
    expect(mocks.getUser).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
