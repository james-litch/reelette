import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getRoom: vi.fn(),
  createClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  not: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  maybeSingle: vi.fn(),
}))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/rooms/queries", () => ({ getRoom: mocks.getRoom }))
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }))
vi.mock("@/lib/supabase/user", () => ({ getUser: vi.fn() }))
import { getRandomSelection } from "@/lib/requests/queries"

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getRoom.mockResolvedValue({
    room: { exclude_last_requestor: true },
    error: null,
  })
  const query = {
    select: mocks.select,
    eq: mocks.eq,
    not: mocks.not,
    order: mocks.order,
    limit: mocks.limit,
    maybeSingle: mocks.maybeSingle,
  }
  mocks.createClient.mockResolvedValue({ from: mocks.from })
  for (const method of [
    mocks.from,
    mocks.select,
    mocks.eq,
    mocks.not,
    mocks.order,
    mocks.limit,
  ])
    method.mockReturnValue(query)
  mocks.maybeSingle.mockResolvedValue({
    data: { requestor_name: "Jamie" },
    error: null,
  })
})
describe("random selection preference", () => {
  it("finds the latest watched requestor across the entire room", async () => {
    expect(await getRandomSelection("room")).toEqual({
      excludedRequestor: "Jamie",
      error: null,
    })
    expect(mocks.eq).toHaveBeenCalledWith("room_id", "room")
    expect(mocks.not).toHaveBeenCalledWith("watched_at", "is", null)
    expect(mocks.order).toHaveBeenCalledWith("watched_at", { ascending: false })
    expect(mocks.limit).toHaveBeenCalledWith(1)
  })
  it("skips history when the setting is disabled", async () => {
    mocks.getRoom.mockResolvedValue({
      room: { exclude_last_requestor: false },
      error: null,
    })
    expect(await getRandomSelection("room")).toEqual({
      excludedRequestor: null,
      error: null,
    })
    expect(mocks.from).not.toHaveBeenCalled()
  })
  it("does not exclude anyone before the first watched movie", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    expect(await getRandomSelection("room")).toEqual({
      excludedRequestor: null,
      error: null,
    })
  })
  it("prevents randomising when the latest requestor cannot be loaded", async () => {
    mocks.maybeSingle.mockRejectedValue(new Error("private details"))
    expect(await getRandomSelection("room")).toMatchObject({
      excludedRequestor: null,
      error: expect.any(String),
    })
  })
  it("does not read history for an inaccessible room", async () => {
    mocks.getRoom.mockResolvedValue({ room: null, error: null })
    expect(await getRandomSelection("room")).toHaveProperty(
      "error",
      expect.any(String)
    )
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
