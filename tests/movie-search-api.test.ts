import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ getUser: vi.fn() }))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/user", () => ({ getUser: mocks.getUser }))

import { GET } from "@/app/api/movies/search/route"

const fetchMock = vi.fn<typeof fetch>()
const token = "private-test-token"

function request(query: string, signal?: AbortSignal) {
  return new Request(
    `https://reelette.example/api/movies/search?${new URLSearchParams({ query })}`,
    { signal }
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("TMDB_ACCESS_TOKEN", token)
  vi.stubGlobal("fetch", fetchMock)
  mocks.getUser.mockResolvedValue({ id: "owner" })
  fetchMock.mockImplementation(async (url) => {
    if (String(url).includes("/genre/movie/list")) {
      return Response.json({ genres: [{ id: 878, name: "Science Fiction" }] })
    }
    return Response.json({
      page: 1,
      total_pages: 1,
      total_results: 2,
      results: [
        {
          id: 157336,
          title: "Interstellar",
          poster_path: "/interstellar.jpg",
          genre_ids: [878, 99999],
          release_date: "2014-11-05",
        },
        {
          id: 2,
          title: "Unreleased movie",
          poster_path: null,
          genre_ids: [],
          release_date: "",
        },
      ],
    })
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("movie search API", () => {
  it("requires authentication before contacting TMDB", async () => {
    mocks.getUser.mockResolvedValue(null)

    const response = await GET(request("Interstellar"))

    expect(response.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(["", " ", "a"])(
    "returns no results without contacting TMDB for short queries (%s)",
    async (query) => {
      const response = await GET(request(query))

      expect(await response.json()).toMatchObject({ results: [], genres: [] })
      expect(fetchMock).not.toHaveBeenCalled()
    }
  )

  it("rejects oversized queries", async () => {
    const response = await GET(request("a".repeat(201)))

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("handles a missing token without contacting TMDB", async () => {
    vi.stubEnv("TMDB_ACCESS_TOKEN", "")

    const response = await GET(request("Interstellar"))

    expect(response.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns TMDB movies unchanged with genres and keeps the token in upstream headers only", async () => {
    const response = await GET(request("  Interstellar & space  "))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(JSON.parse(body)).toEqual({
      page: 1,
      total_pages: 1,
      total_results: 2,
      genres: [{ id: 878, name: "Science Fiction" }],
      results: [
        {
          id: 157336,
          title: "Interstellar",
          poster_path: "/interstellar.jpg",
          genre_ids: [878, 99999],
          release_date: "2014-11-05",
        },
        {
          id: 2,
          title: "Unreleased movie",
          poster_path: null,
          genre_ids: [],
          release_date: "",
        },
      ],
    })
    expect(body).not.toContain(token)

    const [url, options] = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/search/movie")
    )!
    expect(new URL(String(url)).searchParams.get("query")).toBe(
      "Interstellar & space"
    )
    expect(new URL(String(url)).searchParams.get("page")).toBe("1")
    expect(String(url)).not.toContain(token)
    expect(new Headers(options?.headers).get("Authorization")).toBe(
      `Bearer ${token}`
    )
    expect(options?.cache).toBe("no-store")
  })

  it("caches the server-side genre lookup for 24 hours without caching search results", async () => {
    await GET(request("Interstellar"))

    const [url, options] = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/genre/movie/list")
    )!
    expect(new URL(String(url)).searchParams.get("language")).toBe("en-US")
    expect(options).toMatchObject({
      cache: "force-cache",
      next: { revalidate: 86_400 },
    })
    expect(String(url)).not.toContain(token)
    expect(new Headers(options?.headers).get("Authorization")).toBe(
      `Bearer ${token}`
    )
    const [, searchOptions] = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/search/movie")
    )!
    expect(searchOptions?.cache).toBe("no-store")
  })

  it("passes the requested page to TMDB and returns its pagination totals", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({
        page: 2,
        total_pages: 3,
        total_results: 45,
        results: [],
      })
    )

    const response = await GET(
      new Request(
        "https://reelette.example/api/movies/search?query=Interstellar&page=2"
      )
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      page: 2,
      total_pages: 3,
      total_results: 45,
    })
    const [url] = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/search/movie")
    )!
    expect(new URL(String(url)).searchParams.get("page")).toBe("2")
  })

  it.each(["0", "-1", "1.5", "501", "NaN", "Infinity", "", "1e2"])(
    "rejects invalid pages before contacting TMDB (%j)",
    async (page) => {
      const params = new URLSearchParams({ query: "Interstellar", page })
      const response = await GET(
        new Request(`https://reelette.example/api/movies/search?${params}`)
      )

      expect(response.status).toBe(400)
      expect(fetchMock).not.toHaveBeenCalled()
    }
  )

  it("allows TMDB's last supported page", async () => {
    const response = await GET(
      new Request(
        "https://reelette.example/api/movies/search?query=Interstellar&page=500"
      )
    )

    expect(response.status).toBe(200)
    const [url] = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/search/movie")
    )!
    expect(new URL(String(url)).searchParams.get("page")).toBe("500")
  })

  it("never returns provider error details or credentials", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { status_message: `Bad credentials: ${token}` },
        { status: 401 }
      )
    )

    const response = await GET(request("Interstellar"))
    const body = await response.text()

    expect(response.status).toBe(502)
    expect(body).not.toContain(token)
    expect(JSON.parse(body)).toEqual({
      error: "Could not search movies. Please try again.",
    })
  })

  it("cancels the movie search without aborting the shared genre lookup", async () => {
    const controller = new AbortController()
    await GET(request("Interstellar", controller.signal))

    const [, searchOptions] = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/search/movie")
    )!
    const [, genreOptions] = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/genre/movie/list")
    )!
    controller.abort()

    expect(searchOptions?.signal?.aborted).toBe(true)
    expect(genreOptions?.signal).toBeInstanceOf(AbortSignal)
    expect(genreOptions?.signal?.aborted).toBe(false)
  })
})
