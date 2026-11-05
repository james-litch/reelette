"use client"

import { useActionState, useId, useState, type RefObject } from "react"
import { LoaderCircle, Plus } from "lucide-react"
import type { Genre, Movie } from "tmdb-ts"

import { createRequest } from "@/app/rooms/[roomId]/requests-actions"
import { MoviePoster } from "@/components/movies/movie-poster"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item"
import {
  REQUESTOR_NAME_MAX_LENGTH,
  type CreateRequestState,
} from "@/lib/requests/types"

export function AddRequestDialog({
  roomId,
  movie,
  genres,
  requestors,
  onClose,
  onSaved,
  returnFocusRef,
}: {
  roomId: string
  movie: Movie
  genres: Genre[]
  requestors: { names: string[]; error?: string; loading: boolean }
  onClose: () => void
  onSaved: (requestor: string) => void
  returnFocusRef: RefObject<HTMLButtonElement | null>
}) {
  const id = useId()
  const [name, setName] = useState("")
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [state, action, pending] = useActionState<CreateRequestState, FormData>(
    async (previous, formData) => {
      try {
        const result = await createRequest(roomId, movie.id, previous, formData)
        if (result.success) onSaved(name.trim())
        return result
      } catch {
        return { error: "We couldn’t save your request. Please try again." }
      }
    },
    {}
  )

  const typedName = name.trim()
  const newName =
    typedName &&
    !requestors.names.some(
      (item) => item.toLowerCase() === typedName.toLowerCase()
    )
      ? typedName
      : null
  const options = newName ? [...requestors.names, newName] : requestors.names

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <DialogContent finalFocus={returnFocusRef} showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle className="text-xl">Add request</DialogTitle>
          <DialogDescription>
            Choose who requested this movie.
          </DialogDescription>
        </DialogHeader>
        <Item className="border-0 p-0 items-start">
          <ItemMedia>
            <MoviePoster
              path={movie.poster_path}
              title={movie.title}
              className="w-24"
              sizes="80px"
            />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="text-lg">{movie.title}</ItemTitle>
            <div className="flex flex-wrap gap-1.5">
              {genres
                .filter((genre) => movie.genre_ids.includes(genre.id))
                .map((genre) => (
                  <Badge key={genre.id} variant="secondary">
                    {genre.name}
                  </Badge>
                ))}
            </div>
          </ItemContent>
        </Item>
        <form action={action} className="flex flex-col gap-6">
          <input type="hidden" name="requestor" value={typedName} />
          <FieldGroup>
            <Field
              data-invalid={Boolean(state.requestorError)}
              data-disabled={pending}
            >
              <FieldLabel htmlFor={id}>Requestor name</FieldLabel>
              <Combobox
                items={options}
                value={selectedName}
                onValueChange={(value) => {
                  setSelectedName(value)
                  setName(value ?? "")
                }}
                inputValue={name}
                onInputValueChange={setName}
                disabled={pending}
              >
                <ComboboxInput
                  id={id}
                  placeholder="Select or add a name…"
                  autoComplete="off"
                  maxLength={REQUESTOR_NAME_MAX_LENGTH}
                  aria-invalid={Boolean(state.requestorError)}
                  aria-describedby={`${id}-description${state.requestorError ? ` ${id}-error` : ""}`}
                />
                <ComboboxContent>
                  <ComboboxEmpty>
                    {requestors.loading
                      ? "Loading names…"
                      : "Type a name to add a requestor."}
                  </ComboboxEmpty>
                  <ComboboxList>
                    {(option: string) => (
                      <ComboboxItem key={option} value={option}>
                        {option === newName ? (
                          <>
                            <Plus aria-hidden="true" /> Add “{option}”
                          </>
                        ) : (
                          option
                        )}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <FieldDescription id={`${id}-description`}>
                {requestors.error ??
                  "Select a previous requestor or enter a new name."}
              </FieldDescription>
              {state.requestorError && (
                <FieldError id={`${id}-error`}>
                  {state.requestorError}
                </FieldError>
              )}
            </Field>
          </FieldGroup>
          {state.error && <FieldError role="alert">{state.error}</FieldError>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || !typedName}
              aria-busy={pending}
            >
              {pending && (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                  aria-hidden="true"
                />
              )}
              {pending ? "Saving…" : "Add request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
