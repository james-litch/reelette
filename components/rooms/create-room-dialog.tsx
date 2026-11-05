"use client"

import {
  useActionState,
  useId,
  useState,
  type ReactElement,
  type RefObject,
} from "react"
import { LoaderCircle } from "lucide-react"

import { createRoom } from "@/app/rooms/actions"
import { Button } from "@/components/ui/button"
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ROOM_NAME_MAX_LENGTH } from "@/lib/rooms/types"

export function CreateRoomDialog({
  trigger,
  open,
  onOpenChange,
  returnFocusRef,
}: {
  trigger?: ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent finalFocus={returnFocusRef}>
        <DialogHeader>
          <DialogTitle>Create a room</DialogTitle>
          <DialogDescription>
            Give your next movie night a name.
          </DialogDescription>
        </DialogHeader>
        <CreateRoomForm />
      </DialogContent>
    </Dialog>
  )
}

function CreateRoomForm() {
  const [state, action, pending] = useActionState(createRoom, {})
  const [name, setName] = useState("")
  const id = useId()

  return (
    <form action={action} className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={Boolean(state.nameError)} data-disabled={pending}>
          <FieldLabel htmlFor={id}>Room name</FieldLabel>
          <Input
            id={id}
            name="name"
            placeholder="Friday Movie Night"
            autoComplete="off"
            required
            maxLength={ROOM_NAME_MAX_LENGTH}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={pending}
            aria-invalid={Boolean(state.nameError)}
            aria-describedby={state.nameError ? `${id}-error` : undefined}
          />
          {state.nameError && (
            <FieldError id={`${id}-error`}>{state.nameError}</FieldError>
          )}
        </Field>
      </FieldGroup>
      {state.error && <FieldError>{state.error}</FieldError>}
      <DialogFooter>
        <DialogClose
          render={<Button type="button" variant="outline" disabled={pending} />}
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
          {pending ? "Creating…" : "Create Room"}
        </Button>
      </DialogFooter>
    </form>
  )
}
