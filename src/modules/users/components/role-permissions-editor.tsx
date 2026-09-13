'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, ShieldCheck, Lock } from 'lucide-react'
import { saveRolePermissionsAction } from '../actions'
import { PermissionGrid, type PermissionRecord } from './permission-grid'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Role = {
  id: string
  code: string
  name_ar: string
  description: string | null
  is_system: boolean
}

type Props = {
  roles: Role[]
  permissions: PermissionRecord[]
  rolePermissions: Record<string, string[]>
}

export function RolePermissionsEditor({ roles, permissions, rolePermissions }: Props) {
  const [activeRoleId, setActiveRoleId] = useState(roles[0]?.id ?? '')
  const [drafts, setDrafts] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {}
    for (const role of roles) initial[role.id] = new Set(rolePermissions[role.id] ?? [])
    return initial
  })
  const [pending, startTransition] = useTransition()

  const activeRole = roles.find((r) => r.id === activeRoleId)

  // مجموعة جديدة في كل تصيير تُبطل useMemo أدناه، فنُثبّتها
  const selected = useMemo(
    () => drafts[activeRoleId] ?? new Set<string>(),
    [drafts, activeRoleId],
  )

  // صلاحيات مدير النظام ثابتة دائمًا — لا يُسمح بإضعافها.
  const locked = activeRole?.code === 'super_admin'

  const dirty = useMemo(() => {
    const saved = new Set(rolePermissions[activeRoleId] ?? [])
    if (saved.size !== selected.size) return true
    for (const id of selected) if (!saved.has(id)) return true
    return false
  }, [selected, rolePermissions, activeRoleId])

  function update(mutate: (set: Set<string>) => void) {
    setDrafts((prev) => {
      const copy = new Set(prev[activeRoleId] ?? [])
      mutate(copy)
      return { ...prev, [activeRoleId]: copy }
    })
  }

  function save() {
    startTransition(async () => {
      const result = await saveRolePermissionsAction(activeRoleId, [...selected])
      if (result.ok) toast.success(result.message ?? 'تم الحفظ')
      else toast.error(result.error)
    })
  }

  return (
    <div className="space-y-4">
      {/* اختيار الدور */}
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => {
          const count = (drafts[role.id] ?? new Set()).size
          const isActive = role.id === activeRoleId
          return (
            <button
              key={role.id}
              onClick={() => setActiveRoleId(role.id)}
              className={cn(
                'flex items-center gap-2 rounded-[var(--radius-app)] border px-3.5 py-2 text-sm transition-colors',
                isActive
                  ? 'border-gold-400 bg-gold-50 font-medium text-navy-900 dark:bg-gold-900/30 dark:text-gold-200'
                  : 'border-border bg-surface hover:bg-surface-muted',
              )}
            >
              {role.code === 'super_admin' ? (
                <Lock className="size-3.5" />
              ) : (
                <ShieldCheck className="size-3.5" />
              )}
              {role.name_ar}
              <span className="rounded-full bg-surface-muted px-1.5 text-[11px] text-muted-foreground tabular">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {activeRole?.description ? (
        <Card>
          <CardContent className="pt-5 text-sm text-muted-foreground">
            {activeRole.description}
            {locked ? (
              <p className="mt-2 text-xs">
                صلاحيات مدير النظام ثابتة ولا يمكن تعديلها — هذا يضمن بقاء جهة
                واحدة على الأقل قادرة على إدارة النظام بالكامل.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <PermissionGrid
        permissions={permissions}
        selected={selected}
        onToggle={(id, next) => update((set) => (next ? set.add(id) : set.delete(id)))}
        onToggleModule={(ids, next) =>
          update((set) => ids.forEach((id) => (next ? set.add(id) : set.delete(id))))
        }
        disabled={pending || locked}
      />

      <Button onClick={save} disabled={pending || locked || !dirty}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        حفظ صلاحيات «{activeRole?.name_ar}»
      </Button>
    </div>
  )
}
