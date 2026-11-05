"use client"

import { LoaderCircle, Settings, Trash2 } from "lucide-react"
import { useId, useState, useTransition } from "react"

import {
  deleteRoom,
  updateRoomSettings,
} from "@/app/rooms/[roomId]/settings-actions"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RoomMembers } from "@/components/rooms/room-members"
import {
  ROOM_NAME_MAX_LENGTH,
  type Room,
  type RoomSettingsState,
} from "@/lib/rooms/types"

export function RoomSettingsDialog({
  room,
  isOwner,
}: {
  room: Room
  isOwner: boolean
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState("general")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [name, setName] = useState(room.name)
  const [excludeLastRequestor, setExcludeLastRequestor] = useState(
    room.exclude_last_requestor
  )
  const [state, setState] = useState<RoomSettingsState>({})
  const [deleteError, setDeleteError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function changeOpen(next: boolean) {
    if (pending) return
    if (next) {
      setTab("general")
      setName(room.name)
      setExcludeLastRequestor(room.exclude_last_requestor)
      setState({})
      setDeleteError(undefined)
      setConfirmDelete(false)
    }
    setOpen(next)
  }

  function saveSettings(formData: FormData) {
    setState({})
    formData.set("excludeLastRequestor", String(excludeLastRequestor))
    startTransition(async () => {
      try {
        const result = await updateRoomSettings(room.id, formData)
        if (result.success) setOpen(false)
        else setState(result)
      } catch {
        setState({
          error: "We couldn’t save the room settings. Please try again.",
        })
      }
    })
  }

  function removeRoom() {
    setDeleteError(undefined)
    startTransition(async () => {
      try {
        const result = await deleteRoom(room.id)
        if (result?.error) setDeleteError(result.error)
      } catch {
        setDeleteError("We couldn’t delete this room. Please try again.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-lg" aria-label="Room settings" />
        }
      >
        <Settings aria-hidden="true" className="size-6" />
      </DialogTrigger>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle className="text-xl">Room settings</DialogTitle>
          <DialogDescription>
            Manage this room and how movies are picked.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (!pending && typeof value === "string") setTab(value)
          }}
          className="gap-6"
        >
          <TabsList className="w-full" aria-label="Room settings">
            <TabsTrigger
              value="general"
              disabled={pending && tab !== "general"}
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="members"
              disabled={pending && tab !== "members"}
            >
              Members
            </TabsTrigger>
            {isOwner && (
              <TabsTrigger
                value="danger"
                disabled={pending && tab !== "danger"}
              >
                Danger
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="general">
            <form action={saveSettings} className="flex flex-col gap-6">
              <FieldGroup>
                <Field
                  data-invalid={Boolean(state.nameError)}
                  data-disabled={pending}
                >
                  <FieldLabel htmlFor={`${id}-name`}>Room name</FieldLabel>
                  <Input
                    id={`${id}-name`}
                    name="name"
                    autoComplete="off"
                    required
                    maxLength={ROOM_NAME_MAX_LENGTH}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={pending}
                    aria-invalid={Boolean(state.nameError)}
                    aria-describedby={
                      state.nameError ? `${id}-name-error` : undefined
                    }
                  />
                  {state.nameError && (
                    <FieldError id={`${id}-name-error`}>
                      {state.nameError}
                    </FieldError>
                  )}
                </Field>
                <Separator />
                <FieldSet disabled={pending}>
                  <FieldLegend>Random selection</FieldLegend>
                  <Field orientation="horizontal" data-disabled={pending}>
                    <FieldContent>
                      <FieldLabel htmlFor={`${id}-exclude`}>
                        Exclude last requestor
                      </FieldLabel>
                      <FieldDescription id={`${id}-exclude-description`}>
                        Skip movies from the requestor whose movie was most
                        recently watched in this room.
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id={`${id}-exclude`}
                      checked={excludeLastRequestor}
                      onCheckedChange={setExcludeLastRequestor}
                      disabled={pending}
                      aria-describedby={`${id}-exclude-description`}
                    />
                  </Field>
                </FieldSet>
              </FieldGroup>
              {state.error && <FieldError>{state.error}</FieldError>}
              <DialogFooter>
                <DialogClose
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                    />
                  }
                >
                  Cancel
                </DialogClose>
                <Button
                  type="submit"
                  disabled={pending || !name.trim()}
                  aria-busy={pending}
                >
                  {pending && (
                    <LoaderCircle
                      data-icon="inline-start"
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {pending ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          <TabsContent value="members" keepMounted>
            <div className="flex flex-col gap-6">
              <RoomMembers
                roomId={room.id}
                isOwner={isOwner}
                active={open && tab === "members"}
              />
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Close
                </DialogClose>
              </DialogFooter>
            </div>
          </TabsContent>
          {isOwner && (
            <TabsContent value="danger" className="flex flex-col gap-6">
              <FieldSet>
                <FieldLegend>Delete room</FieldLegend>
                <FieldDescription>
                  Permanently delete this room, all its movie requests, and its
                  watched history. This cannot be undone.
                </FieldDescription>
                <AlertDialog
                  open={confirmDelete}
                  onOpenChange={(next) => {
                    if (!pending) setConfirmDelete(next)
                  }}
                >
                  <AlertDialogTrigger
                    render={<Button variant="destructive" className="w-fit" />}
                  >
                    <Trash2 data-icon="inline-start" aria-hidden="true" />
                    Delete room
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {room.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        All movie requests and watched history in this room will
                        be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    {deleteError && <FieldError>{deleteError}</FieldError>}
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={pending}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        disabled={pending}
                        aria-busy={pending}
                        onClick={removeRoom}
                      >
                        {pending && (
                          <LoaderCircle
                            data-icon="inline-start"
                            className="animate-spin"
                            aria-hidden="true"
                          />
                        )}
                        {pending ? "Deleting…" : "Permanently delete room"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </FieldSet>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Close
                </DialogClose>
              </DialogFooter>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
