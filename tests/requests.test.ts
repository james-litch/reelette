import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  verifyUser: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  insert: vi.fn(),
  rpc: vi.fn(),
  getMovie: vi.fn(),
  revalidatePath: vi.fn(),
  order: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }))
vi.mock("@/lib/supabase/user", () => ({ getUser: mocks.getUser }))
vi.mock("@/lib/tmdb/movie", () => ({ getMovie: mocks.getMovie }))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))

import {
  createRequest,
  getRequestors,
} from "@/app/rooms/[roomId]/requests-actions"
import { getRequests } from "@/lib/requests/queries"

const roomId = "11111111-1111-4111-8111-111111111111"
const query = {
  select: mocks.select,
  eq: mocks.eq,
  maybeSingle: mocks.maybeSingle,
  insert: mocks.insert,
  order: mocks.order,
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.verifyUser.mockResolvedValue({
    data: { user: { id: "owner" } },
    error: null,
  })
  mocks.getUser.mockResolvedValue({ id: "owner" })
  mocks.createClient.mockResolvedValue({
    auth: { getUser: mocks.verifyUser },
    from: mocks.from,
    rpc: mocks.rpc,
  })
  mocks.from.mockReturnValue(query)
  mocks.select.mockReturnValue(query)
  mocks.eq.mockReturnValue(query)
  mocks.order.mockReturnValue(query)
  mocks.maybeSingle.mockResolvedValue({ data: { id: roomId }, error: null })
  mocks.insert.mockResolvedValue({ error: null })
  mocks.rpc.mockResolvedValue({ data: [{ name: "Jamie" }], error: null })
  mocks.getMovie.mockResolvedValue({
    title: "Interstellar",
    poster_path: "/poster.jpg",
    release_date: "2014-11-05",
    genres: [{ id: 878, name: "Science Fiction" }],
  })
})

function form(name: string = " Jamie ") {
  const data = new FormData()
  data.set("requestor", name)
  return data
}

describe("creating movie requests", () => {
  it("verifies ownership and saves authoritative movie details with a trimmed requestor", async () => {
    const data = form()
    data.set("title", "Forged movie")
    data.set("owner_id", "someone-else")
    expect(await createRequest(roomId, 157336, {}, data)).toEqual({
      success: true,
    })
    expect(mocks.createClient).toHaveBeenCalledWith({ canWriteCookies: true })
    expect(mocks.eq).toHaveBeenCalledWith("id", roomId)
    expect(mocks.eq).toHaveBeenCalledWith("owner_id", "owner")
    expect(mocks.getMovie).toHaveBeenCalledWith(157336)
    expect(mocks.insert).toHaveBeenCalledWith({
      room_id: roomId,
      tmdb_id: 157336,
      title: "Interstellar",
      poster_path: "/poster.jpg",
      release_year: 2014,
      genres: ["Science Fiction"],
      requestor_name: "Jamie",
    })
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/rooms/${roomId}`)
  })

  it.each(["", "   ", "a".repeat(81)])(
    "rejects invalid requestor names (%s)",
    async (name) => {
      expect(await createRequest(roomId, 1, {}, form(name))).toHaveProperty(
        "requestorError"
      )
      expect(mocks.insert).not.toHaveBeenCalled()
    }
  )

  it("rejects missing or file requestor values", async () => {
    const data = new FormData()
    expect(await createRequest(roomId, 1, {}, data)).toHaveProperty(
      "requestorError"
    )
    data.set("requestor", new Blob(["Jamie"]), "name.txt")
    expect(await createRequest(roomId, 1, {}, data)).toHaveProperty(
      "requestorError"
    )
    expect(mocks.getMovie).not.toHaveBeenCalled()
  })

  it("accepts 80 unicode characters and missing poster/year", async () => {
    mocks.getMovie.mockResolvedValueOnce({
      title: "Upcoming",
      poster_path: null,
      release_date: "",
      genres: [],
    })
    expect(await createRequest(roomId, 1, {}, form("🎬".repeat(80)))).toEqual({
      success: true,
    })
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ poster_path: null, release_year: null })
    )
  })

  it.each([0, -1, 1.5, NaN, Infinity, 2_147_483_648])(
    "rejects invalid movie ID %s",
    async (movieId) => {
      expect(await createRequest(roomId, movieId, {}, form())).toHaveProperty(
        "error"
      )
      expect(mocks.getMovie).not.toHaveBeenCalled()
    }
  )

  it("rejects invalid room IDs", async () => {
    expect(await createRequest("bad", 1, {}, form())).toHaveProperty("error")
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it.each([null, { id: "unverified" }])(
    "rejects missing or failed authentication",
    async (user) => {
      mocks.verifyUser.mockResolvedValueOnce({
        data: { user },
        error: user ? new Error("invalid session") : null,
      })
      expect(await createRequest(roomId, 1, {}, form())).toHaveProperty("error")
      expect(mocks.from).not.toHaveBeenCalled()
      expect(mocks.getMovie).not.toHaveBeenCalled()
    }
  )

  it("does not fetch movie details or insert when the room is unavailable", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    expect(await createRequest(roomId, 1, {}, form())).toEqual({
      error: "This room is unavailable.",
    })
    expect(mocks.getMovie).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("returns safe errors on provider and database failures without revalidating", async () => {
    mocks.getMovie.mockRejectedValueOnce(new Error("secret provider response"))
    expect(await createRequest(roomId, 1, {}, form())).toEqual({
      error: "We couldn’t save your request. Please try again.",
    })
    mocks.insert.mockResolvedValueOnce({
      error: { message: "private database response" },
    })
    expect(await createRequest(roomId, 1, {}, form())).toEqual({
      error: "We couldn’t save your request. Please try again.",
    })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})

describe("reading requests and requestors", () => {
  it("loads names only for the specified room", async () => {
    expect(await getRequestors(roomId)).toEqual({ names: ["Jamie"] })
    expect(mocks.rpc).toHaveBeenCalledWith("get_room_requestors", {
      room_id: roomId,
    })
  })

  it("rejects signed-out and invalid name lookups", async () => {
    expect(await getRequestors("bad")).toHaveProperty("error")
    mocks.verifyUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })
    expect(await getRequestors(roomId)).toHaveProperty("error")
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("returns a usable fallback when name lookup fails", async () => {
    mocks.rpc.mockRejectedValueOnce(new Error("private"))
    expect(await getRequestors(roomId)).toEqual({
      names: [],
      error: expect.stringContaining("still enter a name"),
    })
  })

  it("filters requests by room and orders newest first", async () => {
    mocks.order
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({ data: [{ id: "request" }], error: null })
    expect(await getRequests(roomId)).toEqual({
      requests: [{ id: "request" }],
      error: null,
    })
    expect(mocks.eq).toHaveBeenCalledWith("room_id", roomId)
    expect(mocks.order).toHaveBeenCalledWith("created_at", { ascending: false })
  })

  it("does not read requests without authentication", async () => {
    mocks.getUser.mockResolvedValueOnce(null)
    expect(await getRequests(roomId)).toHaveProperty("error")
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
