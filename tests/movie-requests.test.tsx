// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { markRequestWatched } = vi.hoisted(() => ({
  markRequestWatched: vi.fn(),
}))
vi.mock("@/app/rooms/[roomId]/requests-actions", () => ({
  markRequestWatched,
  deleteRequest: vi.fn(),
}))

import { MovieRequests } from "@/components/requests/movie-requests"
import type { MovieRequest, RequestActionResult } from "@/lib/requests/types"

const requests: MovieRequest[] = [
  {
    id: "first",
    room_id: "room",
    tmdb_id: 1,
    title: "Interstellar",
    poster_path: null,
    genres: ["Science Fiction", "Drama"],
    release_year: 2014,
    requestor_name: "Jamie",
    created_at: "2026-11-05T12:00:00Z",
    watched_at: null,
  },
  {
    id: "second",
    room_id: "room",
    tmdb_id: 2,
    title: "Barbie",
    poster_path: null,
    genres: ["Comedy"],
    release_year: 2023,
    requestor_name: "Alex",
    created_at: "2026-11-05T11:00:00Z",
    watched_at: null,
  },
  {
    id: "third",
    room_id: "room",
    tmdb_id: 3,
    title: "Dune",
    poster_path: null,
    genres: ["Science Fiction"],
    release_year: 2021,
    requestor_name: "jamie",
    created_at: "2026-11-05T10:00:00Z",
    watched_at: null,
  },
]

beforeEach(() => {
  markRequestWatched.mockReset().mockResolvedValue({ success: true })
  vi.spyOn(Math, "random").mockReturnValue(0)
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function selectFilter(label: string, option: string) {
  fireEvent.click(screen.getByRole("button", { name: label }))
  fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: option }))
  fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" })
}

function titles() {
  return within(screen.getByRole("list", { name: "Movie requests" }))
    .getAllByRole("heading")
    .map((heading) => heading.textContent)
}

describe("request filters and random movie choice", () => {
  it("excludes the last requestor from random picks, including different casing, without hiding requests", async () => {
    render(<MovieRequests requests={requests} excludedRequestor=" JAMIE " />)
    expect(titles()).toHaveLength(3)
    fireEvent.click(screen.getByRole("button", { name: "Randomise movie" }))
    const dialog = within(await screen.findByRole("dialog"))
    expect(dialog.getByRole("heading", { name: "Barbie (2023)" })).toBeDefined()
    expect(
      (dialog.getByRole("button", { name: "Pick again" }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
  })

  it("does not fall back to an excluded requestor when filters leave no eligible movies", async () => {
    render(<MovieRequests requests={requests} excludedRequestor="Jamie" />)
    await selectFilter("Filter by requestor", "Jamie")
    expect(titles()).toHaveLength(2)
    expect(
      (
        screen.getByRole("button", {
          name: "Randomise movie",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
    expect(screen.getByRole("status").textContent).toContain(
      "No movies are eligible"
    )
  })

  it("disables random selection on history errors while keeping requests available", () => {
    render(
      <MovieRequests requests={requests} randomError="History unavailable" />
    )
    expect(titles()).toHaveLength(3)
    expect(
      (
        screen.getByRole("button", {
          name: "Randomise movie",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
    expect(screen.getByRole("status").textContent).toBe("History unavailable")
  })

  it("keeps multiple genre checkboxes open and randomises only matching movies", async () => {
    render(<MovieRequests requests={requests} />)
    fireEvent.click(screen.getByRole("button", { name: "Filter by genre" }))
    const drama = await screen.findByRole("menuitemcheckbox", { name: "Drama" })
    const comedy = screen.getByRole("menuitemcheckbox", { name: "Comedy" })
    fireEvent.click(drama)
    fireEvent.click(comedy)
    expect(drama.getAttribute("aria-checked")).toBe("true")
    expect(comedy.getAttribute("aria-checked")).toBe("true")
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" })
    expect(
      screen.getByRole("button", { name: "Filter by genre" }).textContent
    ).toContain("2 genres")
    expect(titles()).toEqual(["Interstellar (2014)", "Barbie (2023)"])
    await selectFilter("Filter by requestor", "Jamie")
    expect(titles()).toEqual(["Interstellar (2014)"])
    await selectFilter("Filter by requestor", "Alex")
    expect(titles()).toEqual(["Interstellar (2014)", "Barbie (2023)"])
    vi.mocked(Math.random).mockReturnValue(0.99)
    fireEvent.click(screen.getByRole("button", { name: "Randomise movie" }))
    const dialog = within(await screen.findByRole("dialog"))
    expect(dialog.getByRole("heading", { name: "Barbie (2023)" })).toBeDefined()
    fireEvent.click(dialog.getByRole("button", { name: "Pick again" }))
    expect(
      dialog.getByRole("heading", { name: "Interstellar (2014)" })
    ).toBeDefined()
    fireEvent.click(dialog.getByRole("button", { name: "Close" }))
    await selectFilter("Filter by genre", "Drama")
    expect(titles()).toEqual(["Barbie (2023)"])
    await selectFilter("Filter by genre", "All genres")
    expect(titles()).toHaveLength(3)
  })

  it("retains other selected genres when one disappears after a refresh", async () => {
    const { rerender } = render(<MovieRequests requests={requests} />)
    await selectFilter("Filter by genre", "Drama")
    await selectFilter("Filter by genre", "Comedy")
    rerender(
      <MovieRequests
        requests={requests.filter((request) => request.id !== "second")}
      />
    )
    expect(titles()).toEqual(["Interstellar (2014)"])
    expect(
      screen.getByRole("button", { name: "Filter by genre" }).textContent
    ).toContain("Drama")
  })

  it("allows multiple requestors to be checked without closing the menu", async () => {
    render(<MovieRequests requests={requests} />)
    fireEvent.click(screen.getByRole("button", { name: "Filter by requestor" }))
    const jamie = await screen.findByRole("menuitemcheckbox", { name: "Jamie" })
    const alex = screen.getByRole("menuitemcheckbox", { name: "Alex" })
    fireEvent.click(jamie)
    fireEvent.click(alex)
    expect(jamie.getAttribute("aria-checked")).toBe("true")
    expect(alex.getAttribute("aria-checked")).toBe("true")
    expect(screen.getAllByRole("menuitemcheckbox")).toHaveLength(3)
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" })
    expect(titles()).toHaveLength(3)
    expect(
      screen.getByRole("button", { name: "Filter by requestor" }).textContent
    ).toContain("2 requestors")
    await selectFilter("Filter by genre", "Comedy")
    expect(titles()).toEqual(["Barbie (2023)"])
    // Unchecking one name leaves the other selected.
    await selectFilter("Filter by requestor", "Jamie")
    expect(titles()).toEqual(["Barbie (2023)"])
    expect(
      screen.getByRole("button", { name: "Filter by requestor" }).textContent
    ).toContain("Alex")
    await selectFilter("Filter by requestor", "Alex")
    await selectFilter("Filter by genre", "All genres")
    expect(titles()).toHaveLength(3)
  })

  it("retains other selected requestors when one disappears after a refresh", async () => {
    const { rerender } = render(<MovieRequests requests={requests} />)
    await selectFilter("Filter by requestor", "Jamie")
    await selectFilter("Filter by requestor", "Alex")
    rerender(
      <MovieRequests
        requests={requests.filter((request) => request.id !== "second")}
      />
    )
    expect(titles()).toEqual(["Interstellar (2014)", "Dune (2021)"])
    expect(
      screen.getByRole("button", { name: "Filter by requestor" }).textContent
    ).toContain("Jamie")
  })

  it("randomises across selected requestors while excluding unselected names", async () => {
    render(
      <MovieRequests
        requests={[
          requests[0],
          requests[1],
          { ...requests[2], requestor_name: "Taylor" },
        ]}
      />
    )
    await selectFilter("Filter by requestor", "Jamie")
    await selectFilter("Filter by requestor", "Alex")
    vi.mocked(Math.random).mockReturnValue(0.99)
    fireEvent.click(screen.getByRole("button", { name: "Randomise movie" }))
    const dialog = within(await screen.findByRole("dialog"))
    expect(dialog.getByRole("heading", { name: "Barbie (2023)" })).toBeDefined()
    fireEvent.click(dialog.getByRole("button", { name: "Pick again" }))
    expect(
      dialog.getByRole("heading", { name: "Interstellar (2014)" })
    ).toBeDefined()
  })

  it("combines requestor and genre filters, deduplicating requestor names ignoring case", async () => {
    render(<MovieRequests requests={requests} />)
    await selectFilter("Filter by requestor", "Jamie")
    expect(titles()).toEqual(["Interstellar (2014)", "Dune (2021)"])
    await selectFilter("Filter by genre", "Drama")
    expect(titles()).toEqual(["Interstellar (2014)"])
    await selectFilter("Filter by requestor", "All requestors")
    await selectFilter("Filter by genre", "All genres")
    expect(titles()).toHaveLength(3)
  })

  it("disables random selection for no matches and lets users clear filters", async () => {
    render(<MovieRequests requests={requests} />)
    await selectFilter("Filter by requestor", "Jamie")
    await selectFilter("Filter by genre", "Comedy")
    expect(screen.getByText("No matching requests")).toBeDefined()
    expect(
      (
        screen.getByRole("button", {
          name: "Randomise movie",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(titles()).toHaveLength(3)
  })

  it("picks only matching movies and picks a different movie on retry", async () => {
    render(<MovieRequests requests={requests} />)
    await selectFilter("Filter by requestor", "Jamie")
    fireEvent.click(screen.getByRole("button", { name: "Randomise movie" }))
    const dialog = within(await screen.findByRole("dialog"))
    expect(
      dialog.getByRole("heading", { name: "Interstellar (2014)" })
    ).toBeDefined()
    expect(dialog.queryByText("Barbie")).toBeNull()
    fireEvent.click(dialog.getByRole("button", { name: "Pick again" }))
    expect(dialog.getByRole("heading", { name: "Dune (2021)" })).toBeDefined()
    fireEvent.click(dialog.getByRole("button", { name: "Mark as watched" }))
    await waitFor(() =>
      expect(markRequestWatched).toHaveBeenCalledExactlyOnceWith(
        "room",
        "third"
      )
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("disables pick again when there is only one distinct movie", async () => {
    render(
      <MovieRequests
        requests={[
          requests[0],
          { ...requests[0], id: "duplicate", requestor_name: "Alex" },
        ]}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Randomise movie" }))
    const dialog = within(await screen.findByRole("dialog"))
    expect(
      (dialog.getByRole("button", { name: "Pick again" }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
  })

  it("keeps the selection open on save errors and allows retrying", async () => {
    markRequestWatched.mockResolvedValueOnce({ error: "Save unavailable" })
    render(<MovieRequests requests={requests} />)
    fireEvent.click(screen.getByRole("button", { name: "Randomise movie" }))
    const dialog = within(await screen.findByRole("dialog"))
    fireEvent.click(dialog.getByRole("button", { name: "Mark as watched" }))
    expect(await dialog.findByText("Save unavailable")).toBeDefined()
    fireEvent.click(dialog.getByRole("button", { name: "Mark as watched" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(markRequestWatched).toHaveBeenCalledTimes(2)
  })

  it("prevents repeat saves, picking again, and dismissal while saving", async () => {
    let resolve!: (result: RequestActionResult) => void
    markRequestWatched.mockReturnValue(
      new Promise<RequestActionResult>((done) => {
        resolve = done
      })
    )
    render(<MovieRequests requests={requests} />)
    fireEvent.click(screen.getByRole("button", { name: "Randomise movie" }))
    const dialog = within(await screen.findByRole("dialog"))
    fireEvent.click(dialog.getByRole("button", { name: "Mark as watched" }))
    expect(
      (dialog.getByRole("button", { name: "Saving…" }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
    expect(
      (dialog.getByRole("button", { name: "Pick again" }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    expect(screen.getByRole("dialog")).toBeDefined()
    await act(async () => resolve({ success: true }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(markRequestWatched).toHaveBeenCalledTimes(1)
  })

  it("handles network errors without losing the choice", async () => {
    markRequestWatched.mockRejectedValue(new Error("network"))
    render(<MovieRequests requests={requests} />)
    fireEvent.click(screen.getByRole("button", { name: "Randomise movie" }))
    const dialog = within(await screen.findByRole("dialog"))
    fireEvent.click(dialog.getByRole("button", { name: "Mark as watched" }))
    expect(
      await dialog.findByText(/We couldn’t mark this movie as watched/)
    ).toBeDefined()
    expect(
      dialog.getByRole("heading", { name: "Interstellar (2014)" })
    ).toBeDefined()
  })

  it("updates the list and filters when requests are removed by a server refresh", async () => {
    const { rerender } = render(<MovieRequests requests={requests} />)
    await selectFilter("Filter by genre", "Comedy")
    expect(titles()).toEqual(["Barbie (2023)"])
    rerender(
      <MovieRequests
        requests={requests.filter((request) => request.id !== "second")}
      />
    )
    expect(titles()).toEqual(["Interstellar (2014)", "Dune (2021)"])
    expect(
      screen.getByRole("button", { name: "Filter by genre" }).textContent
    ).toContain("All genres")
  })
})
