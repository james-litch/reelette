// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getRoomMembers: vi.fn(),
  createRoomInvite: vi.fn(),
  writeText: vi.fn(),
}))
vi.mock("@/app/rooms/[roomId]/invite-actions", () => mocks)
import { RoomMembers } from "@/components/rooms/room-members"

const roomId = "11111111-1111-4111-8111-111111111111"
const token = "22222222-2222-4222-8222-222222222222"
beforeEach(() => {
  vi.resetAllMocks()
  mocks.getRoomMembers.mockResolvedValue({
    members: [
      { user_id: "owner", name: "Alex", is_owner: true },
      { user_id: "member", name: "Taylor", is_owner: false },
    ],
  })
  mocks.createRoomInvite.mockResolvedValue({
    token,
    expiresAt: "2026-11-05T13:00:00Z",
  })
  mocks.writeText.mockResolvedValue(undefined)
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: mocks.writeText },
  })
})
afterEach(cleanup)

describe("room members tab", () => {
  it("loads members only while active and shows names with owner/member badges", async () => {
    const { rerender } = render(
      <RoomMembers roomId={roomId} isOwner active={false} />
    )
    expect(mocks.getRoomMembers).not.toHaveBeenCalled()
    rerender(<RoomMembers roomId={roomId} isOwner active />)
    expect(await screen.findByText("Alex")).toBeDefined()
    expect(screen.getByText("Taylor")).toBeDefined()
    expect(screen.getByText("Owner")).toBeDefined()
    expect(screen.getByText("Member")).toBeDefined()
  })
  it("lets an owner generate and copy a link, then replace it", async () => {
    render(<RoomMembers roomId={roomId} isOwner active />)
    fireEvent.click(screen.getByRole("button", { name: "Create invite link" }))
    const input = (await screen.findByRole("textbox", {
      name: "Invite link",
    })) as HTMLInputElement
    expect(input.value).toBe(`${window.location.origin}/invites/${token}`)
    expect(input.readOnly).toBe(true)
    expect(screen.getByText(/^Expires /).textContent).toContain(
      new Date("2026-11-05T13:00:00Z").toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    )
    expect(mocks.createRoomInvite).toHaveBeenCalledExactlyOnceWith(roomId)
    fireEvent.click(screen.getByRole("button", { name: "Copy invite link" }))
    await screen.findByText("Invite link copied.")
    expect(mocks.writeText).toHaveBeenCalledWith(input.value)
    const replacement = "33333333-3333-4333-8333-333333333333"
    mocks.createRoomInvite.mockResolvedValue({
      token: replacement,
      expiresAt: "2026-11-05T14:00:00Z",
    })
    fireEvent.click(
      screen.getByRole("button", { name: "Create new invite link" })
    )
    await waitFor(() => expect(input.value).toContain(replacement))
  })
  it("shows members to invited users without invite creation controls", async () => {
    render(<RoomMembers roomId={roomId} isOwner={false} active />)
    expect(await screen.findByText("Taylor")).toBeDefined()
    expect(screen.queryByText("Invite people")).toBeNull()
    expect(
      screen.queryByRole("button", { name: "Create invite link" })
    ).toBeNull()
    expect(mocks.createRoomInvite).not.toHaveBeenCalled()
  })
  it("provides retry on failed member loading", async () => {
    mocks.getRoomMembers.mockResolvedValueOnce({
      members: [],
      error: "Couldn’t load members",
    })
    render(<RoomMembers roomId={roomId} isOwner active />)
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Couldn’t load members"
    )
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByText("Alex")).toBeDefined()
  })
  it("keeps a link available for manual copying if clipboard access fails", async () => {
    mocks.writeText.mockRejectedValue(new Error("denied"))
    render(<RoomMembers roomId={roomId} isOwner active />)
    fireEvent.click(screen.getByRole("button", { name: "Create invite link" }))
    await screen.findByRole("textbox", { name: "Invite link" })
    fireEvent.click(screen.getByRole("button", { name: "Copy invite link" }))
    expect(
      await screen.findByText(
        "Copying isn’t available. Select the link and copy it manually."
      )
    ).toBeDefined()
  })
  it("shows creation failures without displaying a link", async () => {
    mocks.createRoomInvite.mockResolvedValue({
      error: "Invite creation failed",
    })
    render(<RoomMembers roomId={roomId} isOwner active />)
    fireEvent.click(screen.getByRole("button", { name: "Create invite link" }))
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Invite creation failed"
    )
    expect(screen.queryByRole("textbox", { name: "Invite link" })).toBeNull()
  })
})
