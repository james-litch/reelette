"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useSelectedLayoutSegment } from "next/navigation"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const tabs = [
  { label: "Requests", value: "requests", path: "" },
  { label: "Search", value: "search", path: "/search" },
  { label: "History", value: "history", path: "/history" },
]

export function RoomTabs({
  roomId,
  children,
}: {
  roomId: string
  children: ReactNode
}) {
  const segment = useSelectedLayoutSegment()
  const activeTab = segment ?? "requests"

  return (
    <Tabs value={activeTab} className="gap-6">
      <TabsList variant="line" aria-label="Room pages" activateOnFocus={false}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            nativeButton={false}
            render={<Link href={`/rooms/${roomId}${tab.path}`} />}
            aria-current={activeTab === tab.value ? "page" : undefined}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={activeTab}>{children}</TabsContent>
    </Tabs>
  )
}
