'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { MODULE_LABELS, ACTION_LABELS, ACTIONS, type Module, type Action } from '@/lib/auth/permissions'
import { cn } from '@/lib/utils'

export type PermissionRecord = {
  id: string
  code: string
  module: string
  action: string
  label_ar: string
}

type Props = {
  permissions: PermissionRecord[]
  /** المفعّلة حاليًا */
  selected: Set<string>
  onToggle: (permissionId: string, next: boolean) => void
  onToggleModule: (permissionIds: string[], next: boolean) => void
  /** صلاحيات موروثة من الدور — تُعرض كمرجع بصري */
  inherited?: Set<string>
  disabled?: boolean
}

/**
 * شبكة الصلاحيات: صف لكل وحدة، وعمود لكل فعل.
 * تُظهر فقط الأفعال المعرَّفة فعليًا لتلك الوحدة في قاعدة البيانات.
 */
export function PermissionGrid({
  permissions, selected, onToggle, onToggleModule, inherited, disabled,
}: Props) {
  // تجميع حسب الوحدة مع الحفاظ على ترتيب الوحدات المنطقي
  const byModule = new Map<string, Map<string, PermissionRecord>>()
  for (const p of permissions) {
    if (!byModule.has(p.module)) byModule.set(p.module, new Map())
    byModule.get(p.module)!.set(p.action, p)
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-app)] border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted">
          <tr>
            <th className="sticky start-0 z-10 bg-surface-muted px-4 py-3 text-start text-xs font-semibold text-muted-foreground">
              الوحدة
            </th>
            {ACTIONS.map((action) => (
              <th
                key={action}
                className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap"
              >
                {ACTION_LABELS[action as Action]}
              </th>
            ))}
            <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">
              الكل
            </th>
          </tr>
        </thead>

        <tbody>
          {[...byModule.entries()].map(([moduleName, actions]) => {
            const ids = [...actions.values()].map((p) => p.id)
            const allOn = ids.every((id) => selected.has(id))
            const someOn = ids.some((id) => selected.has(id))

            return (
              <tr key={moduleName} className="border-t border-border hover:bg-surface-muted/50">
                <td className="sticky start-0 z-10 bg-surface px-4 py-2.5 font-medium whitespace-nowrap">
                  {MODULE_LABELS[moduleName as Module] ?? moduleName}
                </td>

                {ACTIONS.map((action) => {
                  const permission = actions.get(action)
                  if (!permission) {
                    return (
                      <td key={action} className="px-3 py-2.5 text-center text-muted-foreground/30">
                        —
                      </td>
                    )
                  }

                  const isInherited = inherited?.has(permission.id) ?? false
                  const isOn = selected.has(permission.id)

                  return (
                    <td key={action} className="px-3 py-2.5 text-center">
                      <span className="inline-flex flex-col items-center gap-0.5">
                        <Checkbox
                          checked={isOn}
                          disabled={disabled}
                          onCheckedChange={(v) => onToggle(permission.id, v === true)}
                          aria-label={`${ACTION_LABELS[action as Action]} — ${MODULE_LABELS[moduleName as Module] ?? moduleName}`}
                        />
                        {inherited ? (
                          <span
                            className={cn(
                              'h-1 w-4 rounded-full',
                              isInherited ? 'bg-gold-400' : 'bg-transparent',
                            )}
                            aria-hidden
                          />
                        ) : null}
                      </span>
                    </td>
                  )
                })}

                <td className="px-3 py-2.5 text-center">
                  <Checkbox
                    checked={allOn ? true : someOn ? 'indeterminate' : false}
                    disabled={disabled}
                    onCheckedChange={(v) => onToggleModule(ids, v === true)}
                    aria-label={`تحديد كل صلاحيات ${MODULE_LABELS[moduleName as Module] ?? moduleName}`}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
