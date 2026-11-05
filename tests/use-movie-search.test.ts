// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useMovieSearch } from "@/app/rooms/[roomId]/search/use-movie-search"

const movie = {
  id: 1,
  title: "Interstellar",
  poster_path: null,
  genre_ids: [878],
  release_date: "2014-11-05",
}
const data = {
  page: 1,
  total_pages: 3,
  total_results: 45,
  results: [movie],
  genres: [{ id: 878, name: "Science Fiction" }],
}
const fetchMock = vi.fn<typeof fetch>()

function renderSearch() {
  return renderHook(useMovieSearch, { reactStrictMode: true })
}

async function advanceTimers(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds)
  })
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.useFakeTimers()
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("movie search hook", () => {
  it("debounces typing and sends only the latest query", async () => {
    fetchMock.mockResolvedValue(Response.json(data))
    const { result } = renderSearch()
    act(() => result.current.setQuery("Inter"))
    await advanceTimers(200)
    act(() => result.current.setQuery("Interstellar & space"))
    await advanceTimers(349)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.status).toBe("loading")
    await advanceTimers(1)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/movies/search?query=Interstellar+%26+space&page=1"
    )
    expect(result.current).toMatchObject({
      status: "success",
      results: data.results,
      genres: data.genres,
      totalPages: 3,
      totalResults: 45,
      error: null,
    })
  })

  it.each(["", " ", "a"])(
    "does not search a short query (%j)",
    async (query) => {
      const { result } = renderSearch()
      act(() => result.current.setQuery(query))
      await advanceTimers(500)
      expect(fetchMock).not.toHaveBeenCalled()
      expect(result.current.status).toBe("idle")
    }
  )

  it("loads the selected page, keeps the full total, and resets new searches to page one", async () => {
    fetchMock.mockImplementation(async (url) => {
      const page = Number(
        new URL(String(url), "https://reelette.example").searchParams.get(
          "page"
        )
      )
      return Response.json({
        ...data,
        page,
        results: [{ ...movie, title: `Page ${page}` }],
      })
    })
    const { result } = renderSearch()
    act(() => result.current.setQuery("Interstellar"))
    await advanceTimers(350)
    act(() => result.current.setPage(2))
    expect(result.current).toMatchObject({
      page: 2,
      status: "loading",
      totalResults: 45,
    })
    await advanceTimers(350)

    expect(result.current).toMatchObject({
      page: 2,
      status: "success",
      totalResults: 45,
      results: [{ ...movie, title: "Page 2" }],
    })
    act(() => result.current.setPage(1))
    await advanceTimers(350)
    expect(result.current.results[0].title).toBe("Page 1")
    act(() => result.current.setPage(3))
    await advanceTimers(350)
    act(() => result.current.setQuery("Dune"))
    expect(result.current).toMatchObject({
      page: 1,
      totalResults: 0,
      totalPages: 0,
    })
    await advanceTimers(350)
    expect(fetchMock.mock.lastCall?.[0]).toBe(
      "/api/movies/search?query=Dune&page=1"
    )
  })

  it("ignores an older page response after a newer page has loaded", async () => {
    const old = deferred<Response>()
    const newest = { ...movie, title: "Page three" }
    fetchMock.mockResolvedValueOnce(Response.json(data))
    fetchMock.mockReturnValueOnce(old.promise)
    fetchMock.mockResolvedValueOnce(
      Response.json({ ...data, page: 3, results: [newest] })
    )
    const { result } = renderSearch()
    act(() => result.current.setQuery("Interstellar"))
    await advanceTimers(350)
    act(() => result.current.setPage(2))
    await advanceTimers(350)
    const signal = fetchMock.mock.lastCall?.[1]?.signal
    act(() => result.current.setPage(3))
    expect(signal?.aborted).toBe(true)
    await advanceTimers(350)
    await act(async () => {
      old.resolve(Response.json({ ...data, page: 2 }))
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current).toMatchObject({
      page: 3,
      status: "success",
      results: [newest],
    })
  })

  it("rejects pages outside the available range and caps navigation at 500", async () => {
    fetchMock.mockResolvedValue(Response.json({ ...data, total_pages: 800 }))
    const { result } = renderSearch()
    act(() => result.current.setQuery("Interstellar"))
    await advanceTimers(350)
    expect(result.current.totalPages).toBe(500)

    for (const page of [0, -1, 1.5, 501, NaN, 1]) {
      act(() => result.current.setPage(page))
    }
    await advanceTimers(350)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current.page).toBe(1)
  })

  it("aborts on input before effect cleanup and ignores old success during debounce", async () => {
    const old = deferred<Response>()
    fetchMock.mockReturnValueOnce(old.promise)
    const { result } = renderSearch()
    act(() => result.current.setQuery("Old movie"))
    await advanceTimers(350)
    const signal = fetchMock.mock.calls[0][1]?.signal

    act(() => {
      result.current.setQuery("New movie")
      expect(signal?.aborted).toBe(true)
    })
    await act(async () => {
      old.resolve(Response.json(data))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current).toMatchObject({
      query: "New movie",
      status: "loading",
      results: [],
      error: null,
    })
  })

  it("ignores an old body that parses after the newest response", async () => {
    const oldBody = deferred<typeof data>()
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => oldBody.promise,
    } as Response)
    fetchMock.mockResolvedValueOnce(Response.json(data))
    const { result } = renderSearch()
    act(() => result.current.setQuery("Old movie"))
    await advanceTimers(350)
    act(() => result.current.setQuery("Interstellar"))
    await advanceTimers(350)
    await act(async () => {
      oldBody.resolve({ ...data, results: [{ ...movie, title: "Old movie" }] })
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current).toMatchObject({
      query: "Interstellar",
      status: "success",
      results: data.results,
      genres: data.genres,
    })
  })

  it("clears previous results and ignores stale failures when input is cleared", async () => {
    const old = deferred<Response>()
    fetchMock.mockResolvedValueOnce(Response.json(data))
    fetchMock.mockReturnValueOnce(old.promise)
    const { result } = renderSearch()
    act(() => result.current.setQuery("Interstellar"))
    await advanceTimers(350)
    expect(result.current.results).toEqual([movie])
    act(() => result.current.setQuery("Old movie"))
    await advanceTimers(350)
    act(() => result.current.setQuery(""))
    await act(async () => {
      old.reject(new Error("Network failure"))
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.current).toMatchObject({
      status: "idle",
      results: [],
      genres: [],
      error: null,
    })
  })

  it("cancels the debounce timer on unmount", async () => {
    const { result, unmount } = renderSearch()
    act(() => result.current.setQuery("Interstellar"))
    unmount()
    await advanceTimers(500)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("aborts an in-flight request on unmount", async () => {
    const pending = deferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise)
    const { result, unmount } = renderSearch()
    act(() => result.current.setQuery("Interstellar"))
    await advanceTimers(350)
    const signal = fetchMock.mock.calls[0][1]?.signal
    unmount()
    expect(signal?.aborted).toBe(true)
    await act(async () => {
      pending.resolve(Response.json(data))
      await vi.advanceTimersByTimeAsync(0)
    })
  })

  it.each([401, 502])("handles a failed request (%s)", async (status) => {
    fetchMock.mockResolvedValue(
      Response.json({ error: "private details" }, { status })
    )
    const { result } = renderSearch()
    act(() => result.current.setQuery("Interstellar"))
    await advanceTimers(350)
    expect(result.current).toMatchObject({
      status: "error",
      results: [],
      error:
        status === 401
          ? "Your session has expired. Sign in again to search movies."
          : "Could not search movies. Please try again.",
    })
  })
})
