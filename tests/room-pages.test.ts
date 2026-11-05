import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getRooms: vi.fn(),
  getRoom: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
  notFound: vi.fn(() => {
    throw new Error("not-found")
  }),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/user", () => ({ getUser: mocks.getUser }))
vi.mock("@/lib/rooms/queries", () => ({
  getRooms: mocks.getRooms,
  getRoom: mocks.getRoom,
}))
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}))

import RoomsPage from "@/app/rooms/page"
import RoomLayout from "@/app/rooms/[roomId]/layout"

const room = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Friday",
  created_at: "2026-11-05T00:00:00Z",
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getUser.mockResolvedValue({ id: "owner" })
  mocks.getRooms.mockResolvedValue({ rooms: [room], error: null })
  mocks.getRoom.mockResolvedValue({ room, error: null })
})

describe("My Rooms", () => {
  it("opens the most recently created room", async () => {
    await expect(RoomsPage()).rejects.toThrow(`redirect:/rooms/${room.id}`)
  })

  it("requires sign-in before loading any rooms", async () => {
    mocks.getUser.mockResolvedValueOnce(null)

    await expect(RoomsPage()).rejects.toThrow("redirect:/#sign-in")
    expect(mocks.getRooms).not.toHaveBeenCalled()
  })

  it("renders a creation prompt when the user has no rooms", async () => {
    mocks.getRooms.mockResolvedValueOnce({ rooms: [], error: null })

    expect(await RoomsPage()).toBeTruthy()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})

describe("shared room layout", () => {
  it("requires sign-in for direct room URLs", async () => {
    mocks.getUser.mockResolvedValueOnce(null)

    await expect(
      RoomLayout({
        children: "room content",
        params: Promise.resolve({ roomId: room.id }),
      })
    ).rejects.toThrow("redirect:/#sign-in")
    expect(mocks.getRoom).not.toHaveBeenCalled()
  })

  it("returns not found for rooms unavailable to the current user", async () => {
    mocks.getRoom.mockResolvedValueOnce({ room: null, error: null })

    await expect(
      RoomLayout({
        children: "room content",
        params: Promise.resolve({ roomId: room.id }),
      })
    ).rejects.toThrow("not-found")
  })

  it("shows a recoverable error rather than a missing-room page on database failure", async () => {
    mocks.getRoom.mockResolvedValueOnce({ room: null, error: "unavailable" })

    expect(
      await RoomLayout({
        children: "room content",
        params: Promise.resolve({ roomId: room.id }),
      })
    ).toBeTruthy()
    expect(mocks.notFound).not.toHaveBeenCalled()
  })
})
