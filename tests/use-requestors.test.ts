// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { getRequestors } = vi.hoisted(() => ({ getRequestors: vi.fn() }))
const realtime = vi.hoisted(() => ({ version: 0 }))
vi.mock("@/app/rooms/[roomId]/requests-actions", () => ({ getRequestors }))
vi.mock("@/components/rooms/room-realtime", () => ({
  useRoomRequestsVersion: () => realtime.version,
}))

import { useRequestors } from "@/app/rooms/[roomId]/search/use-requestors"

function deferred() {
  let resolve!: (result: { names: string[]; error?: string }) => void
  const promise = new Promise<{ names: string[]; error?: string }>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(() => {
  getRequestors.mockReset()
  realtime.version = 0
})
afterEach(cleanup)

describe("requestor names on the Search page", () => {
  it("reloads names after a room event and drops names whose requests were deleted", async () => {
    getRequestors
      .mockResolvedValueOnce({ names: ["Jamie"] })
      .mockResolvedValueOnce({ names: ["Taylor"] })
    const { result, rerender } = renderHook(() => useRequestors("room"))
    await act(async () => {})
    expect(result.current.requestors.names).toEqual(["Jamie"])
    realtime.version++
    rerender()
    await act(async () => {})
    expect(result.current.requestors.names).toEqual(["Taylor"])
    expect(getRequestors).toHaveBeenCalledTimes(2)
  })

  it("ignores stale refreshes while keeping names saved during the newest lookup", async () => {
    const oldLoad = deferred()
    const newLoad = deferred()
    getRequestors
      .mockReturnValueOnce(oldLoad.promise)
      .mockReturnValueOnce(newLoad.promise)
    const { result, rerender } = renderHook(() => useRequestors("room"))
    realtime.version++
    rerender()
    act(() => result.current.addRequestor("Alex"))
    await act(async () => newLoad.resolve({ names: ["Taylor"] }))
    await act(async () => oldLoad.resolve({ names: ["Stale"] }))
    expect(result.current.requestors.names).toEqual(["Alex", "Taylor"])
  })

  it("loads once even in Strict Mode and reuses names across page rerenders", async () => {
    getRequestors.mockResolvedValue({ names: ["Jamie"] })
    const { result, rerender } = renderHook(() => useRequestors("room"), {
      reactStrictMode: true,
    })
    await act(async () => {})

    expect(result.current.requestors).toMatchObject({
      names: ["Jamie"],
      loading: false,
    })
    rerender()
    rerender()
    expect(getRequestors).toHaveBeenCalledExactlyOnceWith("room")
  })

  it("adds saved names immediately, trimming and deduplicating them ignoring case", async () => {
    getRequestors.mockResolvedValue({ names: ["Jamie"] })
    const { result } = renderHook(() => useRequestors("room"))
    await act(async () => {})

    act(() => {
      result.current.addRequestor(" Alex ")
      result.current.addRequestor("jamie")
      result.current.addRequestor("   ")
    })
    expect(result.current.requestors.names).toEqual(["Alex", "Jamie"])
    expect(getRequestors).toHaveBeenCalledTimes(1)
  })

  it("keeps newly saved names when the initial lookup finishes later", async () => {
    const load = deferred()
    getRequestors.mockReturnValue(load.promise)
    const { result } = renderHook(() => useRequestors("room"))
    act(() => result.current.addRequestor("Alex"))
    await act(async () => load.resolve({ names: ["Jamie"] }))

    expect(result.current.requestors).toMatchObject({
      names: ["Alex", "Jamie"],
      loading: false,
    })
  })

  it("clears names when switching rooms and ignores the old room's late response", async () => {
    const first = deferred()
    const second = deferred()
    getRequestors
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const { result, rerender } = renderHook(
      ({ roomId }) => useRequestors(roomId),
      {
        initialProps: { roomId: "first" },
      }
    )
    act(() => result.current.addRequestor("First room only"))
    rerender({ roomId: "second" })
    expect(result.current.requestors).toEqual({ names: [], loading: true })
    await act(async () => second.resolve({ names: ["Alex"] }))
    await act(async () => first.resolve({ names: ["Jamie"] }))

    expect(result.current.requestors.names).toEqual(["Alex"])
    expect(getRequestors).toHaveBeenCalledTimes(2)
  })

  it("keeps local names usable when the lookup fails", async () => {
    const load = deferred()
    getRequestors.mockReturnValue(load.promise)
    const { result } = renderHook(() => useRequestors("room"))
    act(() => result.current.addRequestor("Alex"))
    await act(async () =>
      load.resolve({ names: [], error: "Lookup unavailable" })
    )

    expect(result.current.requestors).toMatchObject({
      names: ["Alex"],
      error: "Lookup unavailable",
      loading: false,
    })
  })

  it("handles network failure without leaving the names loading", async () => {
    getRequestors.mockRejectedValue(new Error("network"))
    const { result } = renderHook(() => useRequestors("room"))
    await act(async () => {})

    expect(result.current.requestors).toMatchObject({
      names: [],
      loading: false,
      error: expect.stringContaining("still enter a name"),
    })
  })
})
