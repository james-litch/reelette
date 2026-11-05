import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  verifyUser: vi.fn(),
  rpc: vi.fn(),
  single: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  cookieSet: vi.fn(),
}))
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mocks.cookieSet }),
}))

import {
  acceptRoomInvite,
  createRoomInvite,
  getRoomMembers,
} from "@/app/rooms/[roomId]/invite-actions"
import { rememberRoomInvite } from "@/app/invites/actions"

const roomId = "11111111-1111-4111-8111-111111111111"
const token = "22222222-2222-4222-8222-222222222222"
beforeEach(() => {
  vi.resetAllMocks()
  mocks.createClient.mockResolvedValue({
    auth: { getUser: mocks.verifyUser },
    rpc: mocks.rpc,
  })
  mocks.verifyUser.mockResolvedValue({
    data: { user: { id: "verified-user" } },
    error: null,
  })
  mocks.redirect.mockImplementation((path: string) => {
    throw new Error(`redirect:${path}`)
  })
})

describe("room invites and members", () => {
  it("creates an invite through the owner-checked database function", async () => {
    mocks.rpc.mockReturnValue({ single: mocks.single })
    mocks.single.mockResolvedValue({
      data: { token, expires_at: "2026-11-05T13:00:00Z" },
      error: null,
    })
    expect(await createRoomInvite(roomId)).toEqual({
      token,
      expiresAt: "2026-11-05T13:00:00Z",
    })
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("create_room_invite", {
      room_id: roomId,
    })
    expect(mocks.createClient).toHaveBeenCalledWith({ canWriteCookies: true })
  })
  it("does not return tokens when invite creation is denied", async () => {
    mocks.rpc.mockReturnValue({ single: mocks.single })
    mocks.single.mockResolvedValue({
      data: null,
      error: { message: "private database detail" },
    })
    expect(await createRoomInvite(roomId)).toEqual({
      error: "We couldn’t create an invite link. Please try again.",
    })
  })
  it("lists members with first names and last initials through the participant-checked function", async () => {
    const members = [
      { user_id: "owner", name: "  Alex Morgan  ", is_owner: true },
      { user_id: "member", name: "Taylor  Marie Smith", is_owner: false },
      { user_id: "single", name: "Prince", is_owner: false },
    ]
    mocks.rpc.mockResolvedValue({ data: members, error: null })
    expect(await getRoomMembers(roomId)).toEqual({
      members: [
        { user_id: "owner", name: "Alex M.", is_owner: true },
        { user_id: "member", name: "Taylor S.", is_owner: false },
        { user_id: "single", name: "Prince", is_owner: false },
      ],
    })
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("get_room_members", {
      room_id: roomId,
    })
  })
  it("does not claim success when a member list is inaccessible", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "denied" } })
    expect(await getRoomMembers(roomId)).toMatchObject({
      members: [],
      error: expect.any(String),
    })
  })
  it("accepts an invite and opens the room after invalidating the room list", async () => {
    mocks.rpc.mockResolvedValue({ data: roomId, error: null })
    await expect(acceptRoomInvite(token)).rejects.toThrow(
      `redirect:/rooms/${roomId}`
    )
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("accept_room_invite", {
      invite_token: token,
    })
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/rooms", "layout")
  })
  it("returns a friendly error for expired or replaced invites without redirecting", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "expired" } })
    expect(await acceptRoomInvite(token)).toHaveProperty("error")
    expect(mocks.redirect).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
  it("rejects malformed room IDs and tokens before querying", async () => {
    expect(await createRoomInvite("bad")).toHaveProperty("error")
    expect(await getRoomMembers("bad")).toHaveProperty("error")
    expect(await acceptRoomInvite("bad")).toHaveProperty("error")
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
  it.each([null, { id: "unverified" }])(
    "requires a verified session for every operation (%s)",
    async (user) => {
      mocks.verifyUser.mockResolvedValue({
        data: { user },
        error: user ? { message: "invalid" } : null,
      })
      expect(await createRoomInvite(roomId)).toHaveProperty("error")
      expect(await getRoomMembers(roomId)).toHaveProperty("error")
      expect(await acceptRoomInvite(token)).toHaveProperty("error")
      expect(mocks.rpc).not.toHaveBeenCalled()
    }
  )
  it("handles transport failures without exposing database details", async () => {
    mocks.createClient.mockRejectedValue(new Error("secret"))
    expect(await createRoomInvite(roomId)).toHaveProperty("error")
    expect(await getRoomMembers(roomId)).toHaveProperty("error")
    expect(await acceptRoomInvite(token)).toEqual({
      error: "We couldn’t join the room. Please try again.",
    })
  })
})

describe("remembering invite sign-in", () => {
  it("remembers only a validated token in a short-lived HttpOnly cookie scoped to the callback", async () => {
    await rememberRoomInvite(token)
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      "reelette-room-invite",
      token,
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/auth/callback",
        maxAge: 600,
      })
    )
  })
  it("clears stale continuations for normal sign-in", async () => {
    await rememberRoomInvite(null)
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      "reelette-room-invite",
      "",
      expect.objectContaining({ maxAge: 0 })
    )
  })
  it("rejects arbitrary destinations", async () => {
    await expect(rememberRoomInvite("https://evil.example")).rejects.toThrow(
      "Invalid room invite"
    )
    expect(mocks.cookieSet).not.toHaveBeenCalled()
  })
})
