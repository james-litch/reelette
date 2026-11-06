"use client"

import { Copy, Link2, LoaderCircle, Trash2 } from "lucide-react"
import { useEffect, useId, useState, useTransition } from "react"

import {
  createRoomInvite,
  getRoomMembers,
  removeRoomMember,
} from "@/app/rooms/[roomId]/invite-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import type { RoomMember } from "@/lib/rooms/types"

export function RoomMembers({
  roomId,
  isOwner,
  active,
}: {
  roomId: string
  isOwner: boolean
  active: boolean
}) {
  const id = useId()
  const [members, setMembers] = useState<RoomMember[]>([])
  const [loading, setLoading] = useState(true)
  const [membersError, setMembersError] = useState<string>()
  const [retry, setRetry] = useState(0)
  const [invite, setInvite] = useState<{ url: string; expiresAt: string }>()
  const [inviteError, setInviteError] = useState<string>()
  const [copyStatus, setCopyStatus] = useState<string>()
  const [pending, startTransition] = useTransition()
  const [removing, startRemoving] = useTransition()
  const [removingId, setRemovingId] = useState<string>()
  const [removeError, setRemoveError] = useState<string>()
  const [removeStatus, setRemoveStatus] = useState<string>()

  useEffect(() => {
    if (!active) return
    let current = true
    // Refresh the list whenever the tab opens; ignore late results after closing/switching rooms.
    async function load() {
      setLoading(true)
      setMembersError(undefined)
      try {
        const result = await getRoomMembers(roomId)
        if (!current) return
        setMembers(result.members)
        setMembersError(result.error)
      } catch {
        if (current)
          setMembersError("We couldn’t load the members. Please try again.")
      } finally {
        if (current) setLoading(false)
      }
    }
    void load()
    return () => {
      current = false
    }
  }, [active, roomId, retry])

  function generateInvite() {
    setInviteError(undefined)
    setCopyStatus(undefined)
    startTransition(async () => {
      try {
        const result = await createRoomInvite(roomId)
        if (result.token && result.expiresAt) {
          setInvite({
            url: `${window.location.origin}/invites/${result.token}`,
            expiresAt: result.expiresAt,
          })
        } else
          setInviteError(
            result.error ??
              "We couldn’t create an invite link. Please try again."
          )
      } catch {
        setInviteError("We couldn’t create an invite link. Please try again.")
      }
    })
  }

  function removeMember(member: RoomMember) {
    if (!isOwner || member.is_owner || removing) return
    setRemovingId(member.user_id)
    setRemoveError(undefined)
    setRemoveStatus(undefined)
    startRemoving(async () => {
      try {
        const result = await removeRoomMember(roomId, member.user_id)
        if (result.success) {
          setMembers((current) =>
            current.filter((item) => item.user_id !== member.user_id)
          )
          setRemoveStatus(`${member.name} was removed from the room.`)
        } else {
          setRemoveError(
            result.error ?? "We couldn’t remove this member. Please try again."
          )
        }
      } catch {
        setRemoveError("We couldn’t remove this member. Please try again.")
      } finally {
        setRemovingId(undefined)
      }
    })
  }

  async function copyInvite() {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.url)
      setCopyStatus("Invite link copied.")
    } catch {
      setCopyStatus(
        "Copying isn’t available. Select the link and copy it manually."
      )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Room members" aria-busy={loading}>
        {loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading members…
          </p>
        ) : membersError ? (
          <div className="flex flex-col items-start gap-3">
            <FieldError>{membersError}</FieldError>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRetry((value) => value + 1)}
            >
              Try again
            </Button>
          </div>
        ) : (
          <ItemGroup
            aria-label="Room members"
            className="max-h-64 overflow-y-auto"
          >
            {members.map((member) => (
              <Item key={member.user_id} role="listitem" size="sm">
                <ItemContent className="min-w-0">
                  <ItemTitle className="max-w-full truncate">
                    {member.name}
                  </ItemTitle>
                </ItemContent>
                <ItemActions>
                  <Badge variant={member.is_owner ? "default" : "secondary"}>
                    {member.is_owner ? "Owner" : "Member"}
                  </Badge>
                  {isOwner && !member.is_owner && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${member.name} from room`}
                      disabled={removing}
                      aria-busy={removing && removingId === member.user_id}
                      onClick={() => removeMember(member)}
                    >
                      {removing && removingId === member.user_id ? (
                        <LoaderCircle
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Trash2 aria-hidden="true" />
                      )}
                    </Button>
                  )}
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        )}
        {removeError && <FieldError>{removeError}</FieldError>}
        {removeStatus && (
          <p role="status" className="text-sm text-muted-foreground">
            {removeStatus}
          </p>
        )}
      </section>
      {isOwner && (
        <>
          <Separator />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={invite ? `${id}-link` : undefined}>
                Invite people
              </FieldLabel>
              <FieldDescription>
                Anyone with the link can sign in and join this room. Links
                expire after 1 hour. Creating a new link replaces the previous
                one.
              </FieldDescription>
              {invite && (
                <>
                  <InputGroup>
                    <InputGroupInput
                      id={`${id}-link`}
                      aria-label="Invite link"
                      value={invite.url}
                      readOnly
                      onFocus={(event) => event.target.select()}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        aria-label="Copy invite link"
                        onClick={copyInvite}
                      >
                        <Copy aria-hidden="true" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>
                    Expires{" "}
                    {new Date(invite.expiresAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    .
                  </FieldDescription>
                </>
              )}
              {copyStatus && (
                <p role="status" className="text-sm text-muted-foreground">
                  {copyStatus}
                </p>
              )}
              {inviteError && <FieldError>{inviteError}</FieldError>}
              <Button
                type="button"
                variant="outline"
                className="w-fit"
                disabled={pending}
                aria-busy={pending}
                onClick={generateInvite}
              >
                {pending ? (
                  <LoaderCircle
                    data-icon="inline-start"
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Link2 data-icon="inline-start" aria-hidden="true" />
                )}
                {pending
                  ? "Creating link…"
                  : invite
                    ? "Create new invite link"
                    : "Create invite link"}
              </Button>
            </Field>
          </FieldGroup>
        </>
      )}
    </div>
  )
}
