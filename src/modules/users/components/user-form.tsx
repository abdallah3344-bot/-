'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save, UserPlus } from 'lucide-react'
import { createUserAction, updateUserAction } from '../actions'
import type { ActionResult } from '@/modules/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { FormField, FormError } from '@/components/shared/form-field'
import { Card, CardContent } from '@/components/ui/card'

type Role = { id: string; code: string; name_ar: string; description: string | null }

type Props = {
  roles: Role[]
  mode: 'create' | 'edit'
  defaults?: {
    id: string
    fullName: string
    username: string
    email: string
    phone: string | null
    jobTitle: string | null
    roleCode: string
    isActive: boolean
  }
  isSelf?: boolean
}

const initialState: ActionResult = { ok: true }

export function UserForm({ roles, mode, defaults, isSelf }: Props) {
  const router = useRouter()
  const action = mode === 'create' ? createUserAction : updateUserAction
  const [state, formAction, pending] = useActionState(action, initialState)

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      if (mode === 'create') router.push('/users')
      else router.refresh()
    }
  }, [state, mode, router])

  const err = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)
  const generalError = !state.ok ? state.error : null

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {defaults ? <input type="hidden" name="id" value={defaults.id} /> : null}

      <FormError message={generalError} />

      <Card>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <FormField name="fullName" label="الاسم الكامل" required error={err('fullName')}>
            <Input
              id="fullName" name="fullName"
              defaultValue={defaults?.fullName}
              placeholder="محمد أحمد العلي"
              aria-invalid={Boolean(err('fullName'))}
            />
          </FormField>

          <FormField
            name="username"
            label="اسم المستخدم"
            required={mode === 'create'}
            error={err('username')}
            hint={mode === 'edit' ? 'اسم المستخدم لا يمكن تغييره بعد الإنشاء' : 'يُستخدم لتسجيل الدخول'}
          >
            <Input
              id="username" name="username" dir="ltr" className="text-start"
              defaultValue={defaults?.username}
              disabled={mode === 'edit'}
              placeholder="mohammed.ali"
              aria-invalid={Boolean(err('username'))}
            />
          </FormField>

          <FormField name="email" label="البريد الإلكتروني" required error={err('email')}>
            <Input
              id="email" name="email" type="email" dir="ltr" className="text-start"
              defaultValue={defaults?.email}
              placeholder="name@example.com"
              aria-invalid={Boolean(err('email'))}
            />
          </FormField>

          {mode === 'create' ? (
            <FormField
              name="password" label="كلمة المرور" required error={err('password')}
              hint="8 أحرف على الأقل، مع حرف كبير وصغير ورقم"
            >
              <Input
                id="password" name="password" type="password" dir="ltr" className="text-start"
                autoComplete="new-password"
                aria-invalid={Boolean(err('password'))}
              />
            </FormField>
          ) : null}

          <FormField name="phone" label="رقم الهاتف" error={err('phone')}>
            <Input
              id="phone" name="phone" dir="ltr" className="text-start"
              defaultValue={defaults?.phone ?? ''}
              placeholder="0599000000"
            />
          </FormField>

          <FormField name="jobTitle" label="المسمّى الوظيفي" error={err('jobTitle')}>
            <Input
              id="jobTitle" name="jobTitle"
              defaultValue={defaults?.jobTitle ?? ''}
              placeholder="محامٍ أول"
            />
          </FormField>

          <FormField
            name="roleCode" label="الدور" required error={err('roleCode')}
            hint={isSelf ? 'لا يمكنك تغيير دور حسابك الشخصي' : undefined}
          >
            <Select name="roleCode" defaultValue={defaults?.roleCode ?? 'lawyer'} disabled={isSelf}>
              <SelectTrigger id="roleCode" aria-invalid={Boolean(err('roleCode'))}>
                <SelectValue placeholder="اختر الدور" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.code}>
                    {role.name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {mode === 'edit' ? (
            <div className="space-y-2">
              <Label htmlFor="isActive">حالة الحساب</Label>
              <div className="flex h-10 items-center gap-3">
                <Switch
                  id="isActive" name="isActive"
                  defaultChecked={defaults?.isActive ?? true}
                  disabled={isSelf}
                />
                <span className="text-sm text-muted-foreground">
                  الحساب مفعّل ويمكنه تسجيل الدخول
                </span>
              </div>
              {isSelf ? (
                <p className="text-xs text-muted-foreground">لا يمكنك تعطيل حسابك الشخصي</p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" />
                   : mode === 'create' ? <UserPlus className="size-4" /> : <Save className="size-4" />}
          {mode === 'create' ? 'إنشاء المستخدم' : 'حفظ التعديلات'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          إلغاء
        </Button>
      </div>
    </form>
  )
}
