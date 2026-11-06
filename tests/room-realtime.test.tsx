// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  router: { refresh: vi.fn() },
  channel: vi.fn(),
  setAuth: vi.fn(),
  removeChannel: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }))
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: mocks.channel,
    realtime: { setAuth: mocks.setAuth },
    removeChannel: mocks.removeChannel,
  }),
}))

import {
  RoomRealtime,
  useRoomRequestsVersion,
} from "@/components/rooms/room-realtime"

function makeChannel() {
  const callbacks: { change: () => void; status: (status: string) => void } = {
    change: () => {},
    status: () => {},
  }
  const channel = {
    on: vi.fn((_type: string, _filter: unknown, callback: () => void) => {
      callbacks.change = callback
      return channel
    }),
    subscribe: vi.fn((callback: (status: string) => void) => {
      callbacks.status = callback
      return channel
    }),
  }
  return { channel, callbacks }
}

function Version({ roomId }: { roomId: string }) {
  return <output>{useRoomRequestsVersion(roomId)}</output>
}

async function flush() {
  await act(async () => {})
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  mocks.setAuth.mockResolvedValue(undefined)
  mocks.removeChannel.mockResolvedValue("ok")
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("room request live updates", () => {
  it("authenticates before subscribing to a private channel for this room", async () => {
    let resolve!: () => void
    mocks.setAuth.mockReturnValue(
      new Promise<void>((done) => {
        resolve = done
      })
    )
    const { channel } = makeChannel()
    mocks.channel.mockReturnValue(channel)
    render(<RoomRealtime roomId="first">Room</RoomRealtime>)
    expect(mocks.channel).toHaveBeenCalledWith("room:first:requests", {
      config: { private: true },
    })
    expect(channel.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "requests_changed" },
      expect.any(Function)
    )
    expect(channel.subscribe).not.toHaveBeenCalled()
    await act(async () => resolve())
    expect(channel.subscribe).toHaveBeenCalledTimes(1)
  })

  it("batches changes, refreshes on subscription/reconnection, and invalidates requestor names", async () => {
    const { channel, callbacks } = makeChannel()
    mocks.channel.mockReturnValue(channel)
    render(
      <RoomRealtime roomId="first">
        <Version roomId="first" />
      </RoomRealtime>
    )
    await flush()
    act(() => {
      callbacks.status("SUBSCRIBED")
      callbacks.change()
      callbacks.change()
      vi.advanceTimersByTime(99)
    })
    expect(mocks.router.refresh).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(mocks.router.refresh).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("status").textContent).toBe("1")
    act(() => {
      callbacks.status("CHANNEL_ERROR")
      callbacks.status("SUBSCRIBED")
      vi.advanceTimersByTime(100)
    })
    expect(mocks.router.refresh).toHaveBeenCalledTimes(2)
    expect(screen.getByRole("status").textContent).toBe("2")
  })

  it("catches up on online, focus and visibility changes", async () => {
    const { channel } = makeChannel()
    mocks.channel.mockReturnValue(channel)
    render(<RoomRealtime roomId="first">Room</RoomRealtime>)
    await flush()
    const visibility = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("hidden")
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
      vi.advanceTimersByTime(100)
    })
    expect(mocks.router.refresh).not.toHaveBeenCalled()
    act(() => {
      visibility.mockReturnValue("visible")
      document.dispatchEvent(new Event("visibilitychange"))
      window.dispatchEvent(new Event("online"))
      window.dispatchEvent(new Event("focus"))
      vi.advanceTimersByTime(100)
    })
    expect(mocks.router.refresh).toHaveBeenCalledTimes(1)
  })

  it("removes the old subscription and ignores late events and queued refreshes when switching rooms", async () => {
    const first = makeChannel()
    const second = makeChannel()
    mocks.channel
      .mockReturnValueOnce(first.channel)
      .mockReturnValueOnce(second.channel)
    const { rerender, unmount } = render(
      <RoomRealtime key="first" roomId="first">
        Room
      </RoomRealtime>
    )
    await flush()
    act(() => first.callbacks.change())
    rerender(
      <RoomRealtime key="second" roomId="second">
        Room
      </RoomRealtime>
    )
    await flush()
    expect(mocks.removeChannel).toHaveBeenCalledWith(first.channel)
    act(() => {
      first.callbacks.change()
      first.callbacks.status("SUBSCRIBED")
      vi.advanceTimersByTime(100)
    })
    expect(mocks.router.refresh).not.toHaveBeenCalled()
    unmount()
    act(() => {
      second.callbacks.change()
      window.dispatchEvent(new Event("online"))
      vi.advanceTimersByTime(100)
    })
    expect(mocks.removeChannel).toHaveBeenCalledWith(second.channel)
    expect(mocks.router.refresh).not.toHaveBeenCalled()
  })

  it("does not subscribe after cleanup during Strict Mode's effect replay", async () => {
    const first = makeChannel()
    const second = makeChannel()
    mocks.channel
      .mockReturnValueOnce(first.channel)
      .mockReturnValueOnce(second.channel)
    render(<RoomRealtime roomId="first">Room</RoomRealtime>, {
      reactStrictMode: true,
    })
    await flush()
    expect(mocks.removeChannel).toHaveBeenCalledWith(first.channel)
    expect(first.channel.subscribe).not.toHaveBeenCalled()
    expect(second.channel.subscribe).toHaveBeenCalledTimes(1)
  })
})
