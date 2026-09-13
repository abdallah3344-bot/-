'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import type { NavItem } from '@/lib/constants/navigation'

type Props = {
  items: NavItem[]
  officeName: string
  officeLogoUrl: string | null
  user: {
    fullName: string
    roleName: string
    email: string
    avatarUrl: string | null
  }
  canSearch: boolean
  unreadCount: number
  children: React.ReactNode
}

export function AppShell({
  items, officeName, officeLogoUrl, user, canSearch, unreadCount, children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar
        items={items}
        officeName={officeName}
        officeLogoUrl={officeLogoUrl}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={user}
          canSearch={canSearch}
          unreadCount={unreadCount}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
