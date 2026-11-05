import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  verifyUser: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }))
vi.mock("@/lib/supabase/user", () => ({ getUser: mocks.getUser }))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))

import { createRoom } from "@/app/rooms/actions"
import { getRoom, getRooms } from "@/lib/rooms/queries"

const roomId = "11111111-1111-4111-8111-111111111111"

beforeEach(() => {
  vi.resetAllMocks()
  mocks.redirect.mockImplementation((path: string) => {
    throw new Error(`redirect:${path}`)
  })
  mocks.getUser.mockResolvedValue({ id: "owner" })
  mocks.verifyUser.mockResolvedValue({
    data: { user: { id: "owner" } },
    error: null,
  })
  mocks.createClient.mockResolvedValue({
    auth: { getUser: mocks.verifyUser },
    from: mocks.from,
  })
  mocks.from.mockReturnValue({ insert: mocks.insert, select: mocks.select })
  mocks.insert.mockReturnValue({ select: mocks.select })
  mocks.select.mockReturnValue({ single: mocks.single })
  mocks.single.mockResolvedValue({ data: { id: roomId }, error: null })
})

function roomForm(name?: string) {
  const form = new FormData()
  if (name !== undefined) form.set("name", name)
  return form
}

describe("creating a room", () => {
  it("trims the name, derives ownership from the verified session, and opens the room", async () => {
    const form = roomForm("  Friday Movie Night  ")
    form.set("owner_id", "forged-owner")

    await expect(createRoom({}, form)).rejects.toThrow(
      `redirect:/rooms/${roomId}`
    )

    expect(mocks.createClient).toHaveBeenCalledWith({ canWriteCookies: true })
    expect(mocks.insert).toHaveBeenCalledWith({
      name: "Friday Movie Night",
      owner_id: "owner",
    })
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/rooms")
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/rooms/[roomId]", "page")
  })

  it.each([undefined, "", "   ", "a".repeat(81)])(
    "rejects invalid names (%s)",
    async (name) => {
      expect(await createRoom({}, roomForm(name))).toHaveProperty("nameError")
      expect(mocks.insert).not.toHaveBeenCalled()
      expect(mocks.redirect).not.toHaveBeenCalled()
    }
  )

  it("rejects files submitted instead of a name", async () => {
    const form = new FormData()
    form.set("name", new Blob(["name"]), "name.txt")

    expect(await createRoom({}, form)).toHaveProperty("nameError")
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("accepts a name at the length limit", async () => {
    await expect(createRoom({}, roomForm("a".repeat(80)))).rejects.toThrow(
      `redirect:/rooms/${roomId}`
    )
  })

  it("requires an authenticated user even when called directly", async () => {
    mocks.verifyUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    expect(await createRoom({}, roomForm("Room"))).toEqual({
      error: "Please sign in before creating a room.",
    })
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("rejects a failed user verification", async () => {
    mocks.verifyUser.mockResolvedValueOnce({
      data: { user: { id: "unverified" } },
      error: new Error("invalid"),
    })

    expect(await createRoom({}, roomForm("Room"))).toHaveProperty("error")
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("returns a safe error when the database rejects creation", async () => {
    mocks.single.mockResolvedValueOnce({
      data: null,
      error: { message: "private database details" },
    })

    expect(await createRoom({}, roomForm("Room"))).toEqual({
      error: "We couldn’t create your room. Please try again.",
    })
    expect(mocks.redirect).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it("handles a network failure without losing control of the form", async () => {
    mocks.single.mockRejectedValueOnce(new Error("network"))

    expect(await createRoom({}, roomForm("Room"))).toHaveProperty("error")
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})

describe("reading rooms", () => {
  it("lists all rooms allowed by participant RLS and orders newest first", async () => {
    const rooms = [
      { id: roomId, name: "Friday", created_at: "2026-11-05T00:00:00Z" },
    ]
    const order = vi.fn().mockReturnValueOnce({
      order: vi.fn().mockResolvedValue({ data: rooms, error: null }),
    })
    mocks.select.mockReturnValueOnce({ order })

    expect(await getRooms()).toEqual({ rooms, error: null })
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false })
  })

  it("loads individual rooms by ID using participant RLS", async () => {
    const room = {
      id: roomId,
      name: "Friday",
      created_at: "2026-11-05T00:00:00Z",
    }
    const maybeSingle = vi.fn().mockResolvedValue({ data: room, error: null })
    const eq = vi.fn().mockReturnThis()
    const query = { eq, maybeSingle }
    mocks.select.mockReturnValueOnce(query)

    expect(await getRoom(roomId)).toEqual({ room, error: null })
    expect(eq).toHaveBeenCalledExactlyOnceWith("id", roomId)
  })

  it("rejects malformed room IDs before querying the database", async () => {
    expect(await getRoom("not-a-uuid")).toEqual({ room: null, error: null })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it("does not read rooms for a signed-out visitor", async () => {
    mocks.getUser.mockResolvedValue(null)

    expect(await getRooms()).toMatchObject({
      rooms: [],
      error: expect.any(String),
    })
    expect(await getRoom(roomId)).toEqual({ room: null, error: null })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it("distinguishes unavailable rooms from a query failure", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "database unavailable" },
      })
    const eq = vi.fn().mockReturnThis()
    mocks.select.mockReturnValue({ eq, maybeSingle })

    expect(await getRoom(roomId)).toEqual({ room: null, error: null })
    expect(await getRoom(roomId)).toEqual({
      room: null,
      error: expect.any(String),
    })
  })
})
