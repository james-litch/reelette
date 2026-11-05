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
import type { Room, RoomSettingsState } from "@/lib/rooms/types"

const mocks = vi.hoisted(() => ({
  updateRoomSettings: vi.fn(),
  deleteRoom: vi.fn(),
}))
vi.mock("@/app/rooms/[roomId]/settings-actions", () => mocks)
import { RoomSettingsDialog } from "@/components/rooms/room-settings-dialog"

const room: Room = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Friday",
  created_at: "2026-11-05T12:00:00Z",
  exclude_last_requestor: false,
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.updateRoomSettings.mockResolvedValue({ success: true })
  mocks.deleteRoom.mockResolvedValue({ error: "Deletion unavailable" })
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
  vi.unstubAllGlobals()
})
async function openSettings() {
  fireEvent.click(screen.getByRole("button", { name: "Room settings" }))
  return within(await screen.findByRole("dialog"))
}
function submitSettings(dialog: ReturnType<typeof within>) {
  fireEvent.submit(
    dialog.getByRole("button", { name: "Save changes" }).closest("form")!
  )
}

describe("room settings dialog", () => {
  it("saves a changed name and switch preference and closes on success", async () => {
    render(<RoomSettingsDialog room={room} />)
    const dialog = await openSettings()
    fireEvent.change(dialog.getByRole("textbox", { name: "Room name" }), {
      target: { value: "Saturday" },
    })
    fireEvent.click(
      dialog.getByRole("switch", { name: "Exclude last requestor" })
    )
    submitSettings(dialog)
    await waitFor(() =>
      expect(mocks.updateRoomSettings).toHaveBeenCalledTimes(1)
    )
    const [id, data] = mocks.updateRoomSettings.mock.calls[0]
    expect(id).toBe(room.id)
    expect(data.get("name")).toBe("Saturday")
    expect(data.get("excludeLastRequestor")).toBe("true")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("resets cancelled edits using the latest saved room on reopening", async () => {
    const { rerender } = render(<RoomSettingsDialog room={room} />)
    const dialog = await openSettings()
    fireEvent.change(dialog.getByRole("textbox"), {
      target: { value: "Unsaved" },
    })
    fireEvent.click(dialog.getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    rerender(
      <RoomSettingsDialog
        room={{ ...room, name: "Saved name", exclude_last_requestor: true }}
      />
    )
    const reopened = await openSettings()
    expect((reopened.getByRole("textbox") as HTMLInputElement).value).toBe(
      "Saved name"
    )
    expect(reopened.getByRole("switch").getAttribute("aria-checked")).toBe(
      "true"
    )
    expect(mocks.updateRoomSettings).not.toHaveBeenCalled()
  })

  it("retains input and shows a validation error on save failure", async () => {
    mocks.updateRoomSettings.mockResolvedValue({
      nameError: "Enter a room name.",
    })
    render(<RoomSettingsDialog room={room} />)
    const dialog = await openSettings()
    submitSettings(dialog)
    expect(await dialog.findByRole("alert")).toHaveProperty(
      "textContent",
      "Enter a room name."
    )
    expect(dialog.getByRole("textbox").getAttribute("aria-invalid")).toBe(
      "true"
    )
  })

  it("blocks dismissal and duplicate saves while a save is pending", async () => {
    let resolve!: (state: RoomSettingsState) => void
    mocks.updateRoomSettings.mockReturnValue(
      new Promise<RoomSettingsState>((done) => {
        resolve = done
      })
    )
    render(<RoomSettingsDialog room={room} />)
    const dialog = await openSettings()
    submitSettings(dialog)
    expect(
      (dialog.getByRole("button", { name: "Saving…" }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    expect(screen.getByRole("dialog")).toBeDefined()
    await act(async () => resolve({ success: true }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(mocks.updateRoomSettings).toHaveBeenCalledTimes(1)
  })

  it("requires confirmation in Danger and keeps the confirmation open on deletion errors", async () => {
    render(<RoomSettingsDialog room={room} />)
    const dialog = await openSettings()
    fireEvent.click(dialog.getByRole("tab", { name: "Danger" }))
    fireEvent.click(await dialog.findByRole("button", { name: "Delete room" }))
    const confirmation = within(await screen.findByRole("alertdialog"))
    expect(
      confirmation.getByRole("heading", { name: "Delete Friday?" })
    ).toBeDefined()
    expect(mocks.deleteRoom).not.toHaveBeenCalled()
    fireEvent.click(confirmation.getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    expect(mocks.deleteRoom).not.toHaveBeenCalled()
    fireEvent.click(dialog.getByRole("button", { name: "Delete room" }))
    const reopened = within(await screen.findByRole("alertdialog"))
    fireEvent.click(
      reopened.getByRole("button", { name: "Permanently delete room" })
    )
    expect(await reopened.findByRole("alert")).toHaveProperty(
      "textContent",
      "Deletion unavailable"
    )
    expect(mocks.deleteRoom).toHaveBeenCalledExactlyOnceWith(room.id)
  })
})
