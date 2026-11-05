import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  verifyUser: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}))
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))

import {
  deleteRoom,
  updateRoomSettings,
} from "@/app/rooms/[roomId]/settings-actions"

const roomId = "11111111-1111-4111-8111-111111111111"
const query = {
  update: mocks.update,
  delete: mocks.delete,
  eq: mocks.eq,
  select: mocks.select,
  maybeSingle: mocks.maybeSingle,
}
function form(name = " Friday ", exclude = "true") {
  const data = new FormData()
  data.set("name", name)
  data.set("excludeLastRequestor", exclude)
  data.set("owner_id", "forged-owner")
  return data
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.createClient.mockResolvedValue({
    auth: { getUser: mocks.verifyUser },
    from: mocks.from,
  })
  mocks.verifyUser.mockResolvedValue({
    data: { user: { id: "owner" } },
    error: null,
  })
  for (const method of [
    mocks.from,
    mocks.update,
    mocks.delete,
    mocks.eq,
    mocks.select,
  ])
    method.mockReturnValue(query)
  mocks.maybeSingle.mockResolvedValue({ data: { id: roomId }, error: null })
  mocks.redirect.mockImplementation((path: string) => {
    throw new Error(`redirect:${path}`)
  })
})

describe("room settings actions", () => {
  it.each(["true", "false"])(
    "saves validated settings (%s) using participant RLS",
    async (exclude) => {
      expect(
        await updateRoomSettings(roomId, form(" Saturday ", exclude))
      ).toEqual({ success: true })
      expect(mocks.update).toHaveBeenCalledWith({
        name: "Saturday",
        exclude_last_requestor: exclude === "true",
      })
      expect(mocks.eq).toHaveBeenCalledWith("id", roomId)
      expect(mocks.eq).not.toHaveBeenCalledWith("owner_id", expect.anything())
      expect(mocks.revalidatePath).toHaveBeenCalledWith(
        `/rooms/${roomId}`,
        "layout"
      )
    }
  )
  it.each(["", "   ", "a".repeat(81)])(
    "rejects invalid names",
    async (name) => {
      expect(await updateRoomSettings(roomId, form(name))).toHaveProperty(
        "nameError"
      )
      expect(mocks.update).not.toHaveBeenCalled()
    }
  )
  it("rejects malformed IDs and preferences before writing", async () => {
    expect(await updateRoomSettings("invalid", form())).toHaveProperty("error")
    expect(
      await updateRoomSettings(roomId, form("Friday", "anything"))
    ).toHaveProperty("error")
    expect(await deleteRoom("invalid")).toHaveProperty("error")
    expect(mocks.from).not.toHaveBeenCalled()
  })
  it.each(["update", "delete"])(
    "requires a verified session for %s",
    async (action) => {
      mocks.verifyUser.mockResolvedValue({ data: { user: null }, error: null })
      const result =
        action === "update"
          ? await updateRoomSettings(roomId, form())
          : await deleteRoom(roomId)
      expect(result).toHaveProperty("error")
      expect(mocks.from).not.toHaveBeenCalled()
    }
  )
  it("deletes only the owner's room and redirects after invalidation", async () => {
    await expect(deleteRoom(roomId)).rejects.toThrow("redirect:/rooms")
    expect(mocks.eq).toHaveBeenCalledWith("id", roomId)
    expect(mocks.eq).toHaveBeenCalledWith("owner_id", "owner")
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/rooms", "layout")
  })
  it.each(["update", "delete"])(
    "reports inaccessible rooms without claiming %s success",
    async (action) => {
      mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
      const result =
        action === "update"
          ? await updateRoomSettings(roomId, form())
          : await deleteRoom(roomId)
      expect(result).toHaveProperty("error")
      expect(mocks.revalidatePath).not.toHaveBeenCalled()
      expect(mocks.redirect).not.toHaveBeenCalled()
    }
  )
  it("returns safe errors on network failures", async () => {
    mocks.createClient.mockRejectedValue(new Error("private network details"))
    expect(await updateRoomSettings(roomId, form())).toEqual({
      error: "We couldn’t save the room settings. Please try again.",
    })
    expect(await deleteRoom(roomId)).toEqual({
      error: "We couldn’t delete this room. Please try again.",
    })
  })
})
