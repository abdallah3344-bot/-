'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { saveNotificationSettingsAction } from '../actions'
import type { ActionResult } from '@/modules/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { FormError } from '@/components/shared/form-field'
import { Card, CardContent } from '@/components/ui/card'

const initialState: ActionResult = { ok: true }

type Defaults = {
  hearingReminder: boolean
  hearingDaysBefore: number
  taskReminder: boolean
  installmentReminder: boolean
  contractReminder: boolean
  contractDaysBefore: number
  poaReminder: boolean
  poaDaysBefore: number
  invoiceReminder: boolean
}

export function NotificationSettingsForm({ defaults }: { defaults: Defaults }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(
    saveNotificationSettingsAction, initialState)

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      router.refresh()
    }
  }, [state, router])

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={!state.ok ? state.error : null} />

      <Card>
        <CardContent className="divide-y divide-border pt-5">
          <Row
            name="hearingReminder" label="تنبيه الجلسات"
            description="تنبيه بالجلسات المجدولة القادمة"
            checked={defaults.hearingReminder}
            daysName="hearingDaysBefore" daysValue={defaults.hearingDaysBefore}
            daysLabel="قبل الجلسة بـ"
          />
          <Row
            name="taskReminder" label="تنبيه المهام المتأخرة"
            description="تنبيه بالمهام التي تجاوزت تاريخ استحقاقها"
            checked={defaults.taskReminder}
          />
          <Row
            name="installmentReminder" label="تنبيه الأقساط المستحقة"
            description="تنبيه بأقساط الأتعاب التي حان موعدها"
            checked={defaults.installmentReminder}
          />
          <Row
            name="contractReminder" label="تنبيه انتهاء العقود"
            description="تنبيه قبل انتهاء العقود السارية"
            checked={defaults.contractReminder}
            daysName="contractDaysBefore" daysValue={defaults.contractDaysBefore}
            daysLabel="قبل الانتهاء بـ"
          />
          <Row
            name="poaReminder" label="تنبيه انتهاء الوكالات"
            description="تنبيه قبل انتهاء الوكالات السارية"
            checked={defaults.poaReminder}
            daysName="poaDaysBefore" daysValue={defaults.poaDaysBefore}
            daysLabel="قبل الانتهاء بـ"
          />
          <Row
            name="invoiceReminder" label="تنبيه الفواتير المتأخرة"
            description="تنبيه بالفواتير التي تجاوزت تاريخ استحقاقها"
            checked={defaults.invoiceReminder}
          />
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        حفظ الإعدادات
      </Button>
    </form>
  )
}

function Row({
  name, label, description, checked, daysName, daysValue, daysLabel,
}: {
  name: string
  label: string
  description: string
  checked: boolean
  daysName?: string
  daysValue?: number
  daysLabel?: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <Label htmlFor={name} className="cursor-pointer">{label}</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="flex items-center gap-4">
        {daysName ? (
          <span className="flex items-center gap-2">
            <label htmlFor={daysName} className="text-xs text-muted-foreground whitespace-nowrap">
              {daysLabel}
            </label>
            <Input
              id={daysName} name={daysName} type="number" min="0" max="365"
              defaultValue={daysValue} dir="ltr"
              className="h-9 w-16 text-center"
            />
            <span className="text-xs text-muted-foreground">يوم</span>
          </span>
        ) : null}
        <Switch id={name} name={name} defaultChecked={checked} />
      </div>
    </div>
  )
}
