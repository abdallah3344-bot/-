'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Scale, X } from 'lucide-react'
import { NavIcon } from './nav-icon'
import { GROUP_LABELS, type NavItem } from '@/lib/constants/navigation'
import { cn } from '@/lib/utils'

type Props = {
  items: NavItem[]
  officeName: string
  officeLogoUrl: string | null
  open: boolean
  onClose: () => void
}

export function Sidebar({ items, officeName, officeLogoUrl, open, onClose }: Props) {
  const pathname = usePathname()

  const groups: NavItem['group'][] = ['main', 'work', 'finance', 'admin']

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      {/* طبقة تعتيم للموبايل */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      ) : null}

      <aside
        data-sidebar
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground',
          'transition-transform duration-200 ease-out',
          // على الشاشات الكبيرة: عمود ثابت داخل التخطيط بلا أي إزاحة.
          'lg:static lg:translate-x-0',
          // الإخفاء إزاحةً يخصّ الموبايل وحده. استُخدم max-lg بدل إزاحة
          // عامة يلغيها lg: لأن ترتيب مُبدّلات Tailwind 4 جعل rtl: يتغلّب
          // على lg:، فبقي الشريط مُزاحًا خارج الشاشة على سطح المكتب.
          // الواجهة عربية RTL دائمًا، فجهة البداية هي اليمين والإزاحة موجبة.
          !open && 'max-lg:translate-x-full',
        )}
      >
        {/* رأس الشريط */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold-500 text-navy-950 overflow-hidden">
            {officeLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={officeLogoUrl} alt="" className="size-full object-cover" />
            ) : (
              <Scale className="size-5" />
            )}
          </div>
          <span className="truncate text-sm font-semibold text-white">{officeName}</span>

          <button
            onClick={onClose}
            className="ms-auto rounded-md p-1.5 text-sidebar-foreground hover:bg-white/10 lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* عناصر القائمة */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="القائمة الرئيسية">
          {groups.map((group) => {
            const groupItems = items.filter((i) => i.group === group)
            if (groupItems.length === 0) return null

            return (
              <div key={group} className="mb-5 last:mb-0">
                {GROUP_LABELS[group] ? (
                  <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-white/35">
                    {GROUP_LABELS[group]}
                  </p>
                ) : null}

                <ul className="space-y-0.5">
                  {groupItems.map((item) => {
                    const active = isActive(item.href)
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                            active
                              ? 'bg-sidebar-active font-medium text-white'
                              : 'text-sidebar-foreground hover:bg-white/5 hover:text-white',
                          )}
                        >
                          {active ? (
                            <span className="absolute inset-y-1.5 start-0 w-1 rounded-full bg-gold-500" />
                          ) : null}
                          <NavIcon
                            name={item.icon}
                            className={cn('size-[18px] shrink-0', active ? 'text-gold-400' : 'opacity-70')}
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 px-5 py-3">
          <p className="text-[11px] text-white/40">نظام إدارة مكتب المحاماة</p>
        </div>
      </aside>
    </>
  )
}
