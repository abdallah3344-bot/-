'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Upload, Scale } from 'lucide-react'
import { uploadLogoAction } from '../actions'
import type { ActionResult } from '@/modules/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { FormField, FormError } from '@/components/shared/form-field'

const initialState: ActionResult = { ok: true }

export function LogoUpload({ currentUrl }: { currentUrl: string | null }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(uploadLogoAction, initialState)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      setPreview(null)
      router.refresh()
    }
  }, [state, router])

  return (
    <Card>
      <CardHeader>
        <CardTitle>شعار المكتب</CardTitle>
        <CardDescription>
          يظهر في الشريط الجانبي وفي الفواتير وسندات القبض المطبوعة.
          الصيغ المدعومة: PNG أو JPG أو WEBP أو SVG حتى 2 ميجابايت.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-4" noValidate>
          <FormError message={!state.ok ? state.error : null} />

          <div className="flex items-center gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-navy-900 text-gold-400">
              {preview ?? currentUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview ?? currentUrl ?? ''} alt="شعار المكتب"
                     className="size-full object-cover" />
              ) : (
                <Scale className="size-8" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <FormField name="logo" label="اختر ملف الشعار">
                <Input
                  id="logo" name="logo" type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    setPreview(file ? URL.createObjectURL(file) : null)
                  }}
                  className="file:me-3 file:rounded file:border-0 file:bg-surface-muted file:px-3 file:py-1 file:text-sm"
                />
              </FormField>
            </div>
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            رفع الشعار
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
