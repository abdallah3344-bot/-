'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save, Briefcase } from 'lucide-react'
import { createCaseAction, updateCaseAction } from '../actions'
import type { ActionResult } from '@/modules/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  SelectGroup, SelectLabel,
} from '@/components/ui/select'
import { GOVERNORATE_GROUPS } from '@/lib/constants/palestine'
import { FormField, FormError } from '@/components/shared/form-field'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  CASE_STATUSES, CASE_STATUS_LABELS, PRIORITIES, PRIORITY_LABELS,
  LITIGATION_DEGREES, LITIGATION_DEGREE_LABELS,
} from '@/lib/constants/enums'

const NONE = '__none__'
const initialState: ActionResult = { ok: true }

export type CaseFormOptions = {
  clients: { id: string; name: string; client_no: string }[]
  caseTypes: { id: string; name_ar: string }[]
  courts: { id: string; name_ar: string; governorate: string | null }[]
  chambers: { id: string; name_ar: string; court_id: string }[]
  judges: { id: string; full_name: string; court_id: string | null }[]
  lawyers: { id: string; full_name: string }[]
}

type Props = {
  mode: 'create' | 'edit'
  options: CaseFormOptions
  defaultClientId?: string
  defaults?: Record<string, string | null>
}

export function CaseForm({ mode, options, defaultClientId, defaults }: Props) {
  const router = useRouter()
  const action = mode === 'create' ? createCaseAction : updateCaseAction
  const [state, formAction, pending] = useActionState(action, initialState)

  // الدائرة والقاضي يتبعان المحكمة المختارة — نُرشّحهما ديناميكيًا
  const [courtId, setCourtId] = useState(defaults?.courtId ?? NONE)

  const chambers = options.chambers.filter((c) => c.court_id === courtId)
  const judges = options.judges.filter((j) => !j.court_id || j.court_id === courtId)

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      const created = (state as ActionResult & { id?: string }).id
      if (mode === 'create' && created) router.push(`/cases/${created}`)
      else router.refresh()
    }
  }, [state, mode, router])

  const err = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      <FormError message={!state.ok ? state.error : null} />

      <Card>
        <CardHeader><CardTitle>بيانات القضية</CardTitle></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField name="title" label="اسم القضية" required error={err('title')}
                     className="sm:col-span-2">
            <Input id="title" name="title" defaultValue={defaults?.title ?? ''}
                   placeholder="مثال: مطالبة مالية ضد شركة النور"
                   aria-invalid={Boolean(err('title'))} />
          </FormField>

          <FormField name="clientId" label="العميل" required error={err('clientId')}>
            <Select name="clientId" defaultValue={defaults?.clientId ?? defaultClientId ?? NONE}>
              <SelectTrigger id="clientId" aria-invalid={Boolean(err('clientId'))}>
                <SelectValue placeholder="اختر العميل" />
              </SelectTrigger>
              <SelectContent>
                {options.clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.client_no}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField name="courtCaseNo" label="رقم القضية في المحكمة" error={err('courtCaseNo')}>
            <Input id="courtCaseNo" name="courtCaseNo" dir="ltr" className="text-start"
                   defaultValue={defaults?.courtCaseNo ?? ''} />
          </FormField>

          <FormField name="caseTypeId" label="نوع القضية" error={err('caseTypeId')}>
            <Select name="caseTypeId" defaultValue={defaults?.caseTypeId ?? NONE}>
              <SelectTrigger id="caseTypeId"><SelectValue placeholder="غير محدّد" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>غير محدّد</SelectItem>
                {options.caseTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name_ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField name="claimAmount" label="قيمة المطالبة" error={err('claimAmount')}>
            <Input id="claimAmount" name="claimAmount" type="number" step="0.01" min="0"
                   dir="ltr" className="text-start"
                   defaultValue={defaults?.claimAmount ?? ''} placeholder="0.00" />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>المحكمة والتقاضي</CardTitle></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField name="courtId" label="المحكمة" error={err('courtId')}>
            <Select name="courtId" value={courtId} onValueChange={setCourtId}>
              <SelectTrigger id="courtId"><SelectValue placeholder="غير محدّدة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>غير محدّدة</SelectItem>
                {options.courts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name_ar}{c.governorate ? ` — ${c.governorate}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            name="chamberId" label="الدائرة" error={err('chamberId')}
            hint={courtId === NONE ? 'اختر المحكمة أولًا' : undefined}
          >
            <Select name="chamberId" defaultValue={defaults?.chamberId ?? NONE}
                    disabled={courtId === NONE || chambers.length === 0}>
              <SelectTrigger id="chamberId"><SelectValue placeholder="غير محدّدة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>غير محدّدة</SelectItem>
                {chambers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField name="judgeId" label="القاضي" error={err('judgeId')}>
            <Select name="judgeId" defaultValue={defaults?.judgeId ?? NONE}>
              <SelectTrigger id="judgeId"><SelectValue placeholder="غير محدّد" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>غير محدّد</SelectItem>
                {judges.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField name="governorate" label="المحافظة" error={err('governorate')}>
            <Select name="governorate" defaultValue={defaults?.governorate ?? NONE}>
              <SelectTrigger id="governorate"><SelectValue placeholder="غير محدّدة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>غير محدّدة</SelectItem>
                {GOVERNORATE_GROUPS.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.items.map((gov) => (
                      <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField name="litigationDegree" label="درجة التقاضي" error={err('litigationDegree')}>
            <Select name="litigationDegree" defaultValue={defaults?.litigationDegree ?? NONE}>
              <SelectTrigger id="litigationDegree"><SelectValue placeholder="غير محدّدة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>غير محدّدة</SelectItem>
                {LITIGATION_DEGREES.map((d) => (
                  <SelectItem key={d} value={d}>{LITIGATION_DEGREE_LABELS[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField name="registeredAt" label="تاريخ التسجيل" error={err('registeredAt')}>
            <Input id="registeredAt" name="registeredAt" type="date"
                   defaultValue={defaults?.registeredAt ?? ''} />
          </FormField>

          <FormField name="firstHearingAt" label="تاريخ أول جلسة" error={err('firstHearingAt')}>
            <Input id="firstHearingAt" name="firstHearingAt" type="date"
                   defaultValue={defaults?.firstHearingAt ?? ''} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>المتابعة والحالة</CardTitle></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField name="responsibleLawyerId" label="المحامي المسؤول"
                     error={err('responsibleLawyerId')}>
            <Select name="responsibleLawyerId" defaultValue={defaults?.responsibleLawyerId ?? NONE}>
              <SelectTrigger id="responsibleLawyerId">
                <SelectValue placeholder="غير محدّد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>غير محدّد</SelectItem>
                {options.lawyers.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField name="assistantLawyerId" label="المحامي المساعد"
                     error={err('assistantLawyerId')}>
            <Select name="assistantLawyerId" defaultValue={defaults?.assistantLawyerId ?? NONE}>
              <SelectTrigger id="assistantLawyerId">
                <SelectValue placeholder="غير محدّد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>غير محدّد</SelectItem>
                {options.lawyers.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField name="priority" label="الأولوية" required error={err('priority')}>
            <Select name="priority" defaultValue={defaults?.priority ?? 'medium'}>
              <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField name="status" label="الحالة" required error={err('status')}>
            <Select name="status" defaultValue={defaults?.status ?? 'new'}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CASE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{CASE_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField name="description" label="وصف القضية" error={err('description')}
                     className="sm:col-span-2">
            <Textarea id="description" name="description" rows={4}
                      defaultValue={defaults?.description ?? ''} />
          </FormField>

          <FormField name="notes" label="ملاحظات" error={err('notes')} className="sm:col-span-2">
            <Textarea id="notes" name="notes" rows={3} defaultValue={defaults?.notes ?? ''} />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" />
                   : mode === 'create' ? <Briefcase className="size-4" /> : <Save className="size-4" />}
          {mode === 'create' ? 'فتح القضية' : 'حفظ التعديلات'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          إلغاء
        </Button>
      </div>
    </form>
  )
}
