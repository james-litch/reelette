"use client"

import { useEffect, useRef, useState } from "react"

import { getRequestors } from "@/app/rooms/[roomId]/requests-actions"

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
  const [state, setState] = useState<{
    roomId: string
    names: string[]
    error?: string
    loading: boolean
  }>({ roomId, names: [], loading: true })
  const load = useRef<{
    roomId: string
    promise: ReturnType<typeof getRequestors>
  } | null>(null)

  useEffect(() => {
    let active = true
    // Reuse the load during Strict Mode's effect replay too.
    if (load.current?.roomId !== roomId) {
      load.current = { roomId, promise: getRequestors(roomId) }
    }
    const apply = (result: { names: string[]; error?: string }) => {
      if (!active) return
      setState((current) => ({
        ...result,
        roomId,
        loading: false,
        // A save can finish before the initial name lookup does.
        names: uniqueNames([
          ...result.names,
          ...(current.roomId === roomId ? current.names : []),
        ]),
      }))
    }
    load.current.promise.then(apply, () =>
      apply({
        names: [],
        error: "Previous names couldn’t be loaded. You can still enter a name.",
      })
    )
    return () => {
      active = false
    }
  }, [roomId])

  function addRequestor(value: string) {
    const name = value.trim()
    if (!name) return
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
