"use client"

import { useEffect, useRef, useState } from "react"

import { getRequestors } from "@/app/rooms/[roomId]/requests-actions"
import { useRoomRequestsVersion } from "@/components/rooms/room-realtime"

function uniqueNames(names: string[]) {
  const seen = new Set<string>()
  return names
    .filter((name) => {
      const key = name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => a.localeCompare(b))
}

export function useRequestors(roomId: string) {
  const version = useRoomRequestsVersion(roomId)
  const [state, setState] = useState<{
    roomId: string
    names: string[]
    error?: string
    loading: boolean
  }>({ roomId, names: [], loading: true })
  const load = useRef<{
    roomId: string
    version: number
    addedNames: string[]
    promise: ReturnType<typeof getRequestors>
  } | null>(null)

  useEffect(() => {
    let active = true
    // Reuse the load during Strict Mode's effect replay too.
    if (load.current?.roomId !== roomId || load.current.version !== version) {
      load.current = {
        roomId,
        version,
        addedNames: [],
        promise: getRequestors(roomId),
      }
    }
    const currentLoad = load.current
    const apply = (result: { names: string[]; error?: string }) => {
      if (!active) return
      setState((current) => ({
        ...result,
        roomId,
        loading: false,
        // Keep saves that finish during this lookup, but drop deleted remote names.
        names: uniqueNames([
          ...result.names,
          ...currentLoad.addedNames,
          ...(result.error && current.roomId === roomId ? current.names : []),
        ]),
      }))
    }
    currentLoad.promise.then(apply, () =>
      apply({
        names: [],
        error: "Previous names couldn’t be loaded. You can still enter a name.",
      })
    )
    return () => {
      active = false
    }
  }, [roomId, version])

  function addRequestor(value: string) {
    const name = value.trim()
    if (!name) return
    if (load.current?.roomId === roomId) load.current.addedNames.push(name)
    setState((current) => ({
      ...(current.roomId === roomId ? current : { roomId, loading: true }),
      names: uniqueNames([
        ...(current.roomId === roomId ? current.names : []),
        name,
      ]),
    }))
  }

  return {
    requestors: state.roomId === roomId ? state : { names: [], loading: true },
    addRequestor,
  }
}
