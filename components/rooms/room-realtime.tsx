"use client"

import { useRouter } from "next/navigation"
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { createClient } from "@/lib/supabase/client"

const RoomRequestsVersion = createContext({ roomId: "", version: 0 })

export function useRoomRequestsVersion(roomId: string) {
  const current = useContext(RoomRequestsVersion)
  return current.roomId === roomId ? current.version : 0
}

export function RoomRealtime({
  roomId,
  children,
}: {
  roomId: string
  children: ReactNode
}) {
  const router = useRouter()
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined

    function scheduleRefresh() {
      if (!active || timer !== undefined) return
      // Batch bursts without indefinitely delaying updates during frequent writes.
      timer = setTimeout(() => {
        timer = undefined
        if (!active) return
        startTransition(() => {
          router.refresh()
          setVersion((current) => current + 1)
        })
      }, 100)
    }

    const channel = supabase
      .channel(`room:${roomId}:requests`, { config: { private: true } })
      .on("broadcast", { event: "requests_changed" }, scheduleRefresh)

    // Use the signed-in user's token; Supabase also propagates session refreshes.
    void supabase.realtime
      .setAuth()
      .then(() => {
        if (!active) return
        channel.subscribe((status) => {
          // Includes reconnects and closes the initial fetch/subscription gap.
          if (status === "SUBSCRIBED") scheduleRefresh()
        })
      })
      .catch(() => {
        console.warn(
          "Room live updates could not connect. Reload to try again."
        )
      })

    function onVisible() {
      if (document.visibilityState === "visible") scheduleRefresh()
    }
    window.addEventListener("online", scheduleRefresh)
    window.addEventListener("focus", scheduleRefresh)
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      active = false
      clearTimeout(timer)
      window.removeEventListener("online", scheduleRefresh)
      window.removeEventListener("focus", scheduleRefresh)
      document.removeEventListener("visibilitychange", onVisible)
      void supabase.removeChannel(channel)
    }
  }, [roomId, router])

  return (
    <RoomRequestsVersion.Provider value={{ roomId, version }}>
      {children}
    </RoomRequestsVersion.Provider>
  )
}
