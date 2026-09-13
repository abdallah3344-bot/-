'use client'

import Link from 'next/link'
import { Menu, Bell, Sun, Moon, User, KeyRound, ChevronDown } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { GlobalSearch } from './global-search'
import { LogoutItem } from './logout-item'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { initials } from '@/lib/utils'

type Props = {
  user: { fullName: string; roleName: string; email: string; avatarUrl: string | null }
  canSearch: boolean
  unreadCount: number
  onMenuClick: () => void
}

export function Header({ user, canSearch, unreadCount, onMenuClick }: Props) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && (resolvedTheme ?? theme) === 'dark'

  return (
    <header className="app-header sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 hover:bg-surface-muted lg:hidden"
        aria-label="فتح القائمة"
      >
        <Menu className="size-5" />
      </button>

      {canSearch ? <GlobalSearch /> : <div className="flex-1" />}

      <div className="flex items-center gap-1 ms-auto">
        {/* تبديل الوضع الليلي */}
        {/* الوضع الحالي معروف بعد التركيب فقط (يُقرأ من التخزين المحلي)،
            لذا نُثبّت المحتوى قبل ذلك لتفادي اختلاف الترطيب. */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={
            !mounted
              ? 'تبديل الوضع الليلي'
              : isDark
                ? 'التبديل للوضع النهاري'
                : 'التبديل للوضع الليلي'
          }
        >
          {mounted && isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </Button>

        {/* التنبيهات */}
        <Button variant="ghost" size="icon" asChild aria-label="التنبيهات">
          <Link href="/notifications" className="relative">
            <Bell className="size-5" />
            {unreadCount > 0 ? (
              <span className="absolute end-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white tabular">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </Link>
        </Button>

        {/* قائمة المستخدم */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-muted">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-gold-400 dark:bg-gold-500 dark:text-navy-950 overflow-hidden">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  initials(user.fullName)
                )}
              </span>
              <span className="hidden text-start sm:block">
                <span className="block text-sm font-medium leading-tight">{user.fullName}</span>
                <span className="block text-[11px] leading-tight text-muted-foreground">
                  {user.roleName}
                </span>
              </span>
              <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block">{user.fullName}</span>
              <span className="block text-xs font-normal text-muted-foreground" dir="ltr">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User />
                الملف الشخصي
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href="/profile/password">
                <KeyRound />
                تغيير كلمة المرور
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <LogoutItem />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
