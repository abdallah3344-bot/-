'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, RotateCcw, Info } from 'lucide-react'
import { saveUserPermissionsAction } from '../actions'
import { PermissionGrid, type PermissionRecord } from './permission-grid'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  userId: string
  userName: string
  roleName: string
  permissions: PermissionRecord[]
  rolePermissionIds: string[]
  grantedIds: string[]
  revokedIds: string[]
}

/**
 * محرّر الصلاحيات الفردية.
 *
 * الصلاحية الفعّالة = صلاحيات الدور ∪ الممنوحة فرديًا − المسحوبة فرديًا.
 * المستخدم يرى هنا النتيجة النهائية مباشرة، وعند الحفظ نحسب الفرق
 * بينها وبين صلاحيات الدور ونخزّن الاستثناءات فقط.
 */
export function UserPermissionsEditor({
  userId, userName, roleName, permissions, rolePermissionIds, grantedIds, revokedIds,
}: Props) {
  const roleSet = useMemo(() => new Set(rolePermissionIds), [rolePermissionIds])

  const effectiveInitial = useMemo(() => {
    const set = new Set(rolePermissionIds)
    for (const id of grantedIds) set.add(id)
    for (const id of revokedIds) set.delete(id)
    return set
  }, [rolePermissionIds, grantedIds, revokedIds])

  const [selected, setSelected] = useState<Set<string>>(() => new Set(effectiveInitial))
  const [pending, startTransition] = useTransition()

  const dirty = useMemo(() => {
    if (selected.size !== effectiveInitial.size) return true
    for (const id of selected) if (!effectiveInitial.has(id)) return true
    return false
  }, [selected, effectiveInitial])

  const overrideCount = useMemo(() => {
    let count = 0
    for (const id of selected) if (!roleSet.has(id)) count++
    for (const id of roleSet) if (!selected.has(id)) count++
    return count
  }, [selected, roleSet])

  function toggle(id: string, next: boolean) {
    setSelected((prev) => {
      const copy = new Set(prev)
      if (next) copy.add(id)
      else copy.delete(id)
      return copy
    })
  }

  function toggleModule(ids: string[], next: boolean) {
    setSelected((prev) => {
      const copy = new Set(prev)
      for (const id of ids) {
        if (next) copy.add(id)
        else copy.delete(id)
      }
      return copy
    })
  }

  function resetToRole() {
    setSelected(new Set(roleSet))
  }

  function save() {
    // نخزّن الاستثناءات فقط، لا القائمة الكاملة — حتى يظل المستخدم
    // يرث أي تعديل مستقبلي على صلاحيات دوره.
    const granted: string[] = []
    const revoked: string[] = []

    for (const permission of permissions) {
      const inRole = roleSet.has(permission.id)
      const isOn = selected.has(permission.id)
      if (isOn && !inRole) granted.push(permission.id)
      if (!isOn && inRole) revoked.push(permission.id)
    }

    startTransition(async () => {
      const result = await saveUserPermissionsAction(userId, granted, revoked)
      if (result.ok) toast.success(result.message ?? 'تم الحفظ')
      else toast.error(result.error)
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-start gap-3 pt-5 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-1">
            <p>
              الصلاحيات المعروضة هي <strong>الصلاحية الفعّالة</strong> لـ «{userName}»:
              ما يرثه من دور «{roleName}» بعد إضافة الاستثناءات الفردية وسحبها.
            </p>
            <p className="text-xs text-muted-foreground">
              الشريط الذهبي أسفل المربّع يعني أن الصلاحية موروثة من الدور.
              أي اختلاف عن الدور يُحفظ كاستثناء فردي، فيبقى المستخدم يرث
              أي تعديل مستقبلي على صلاحيات دوره.
            </p>
          </div>
          {overrideCount > 0 ? (
            <span className="shrink-0 rounded-full bg-gold-100 px-2.5 py-1 text-xs font-medium text-gold-800 dark:bg-gold-900/40 dark:text-gold-300">
              {overrideCount} استثناء عن الدور
            </span>
          ) : null}
        </CardContent>
      </Card>

      <PermissionGrid
        permissions={permissions}
        selected={selected}
        inherited={roleSet}
        onToggle={toggle}
        onToggleModule={toggleModule}
        disabled={pending}
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={pending || !dirty}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          حفظ الصلاحيات
        </Button>
        <Button variant="outline" onClick={resetToRole} disabled={pending}>
          <RotateCcw className="size-4" />
          إعادة الضبط لصلاحيات الدور
        </Button>
      </div>
    </div>
  )
}
