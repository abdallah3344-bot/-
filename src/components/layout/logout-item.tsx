'use client'

import { useTransition } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { logoutAction } from '@/modules/auth/actions'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

/**
 * تسجيل الخروج من داخل القائمة المنسدلة.
 *
 * لا نستخدم <form action> هنا: Radix يُغلق القائمة عند اختيار العنصر،
 * فيُفكَّك زر الإرسال قبل أن يكتمل الإرسال ولا يحدث شيء.
 * لذلك نمنع الإغلاق الافتراضي ونستدعي الإجراء داخل transition.
 */
export function LogoutItem() {
  const [pending, startTransition] = useTransition()

  return (
    <DropdownMenuItem
      destructive
      disabled={pending}
      onSelect={(event) => {
        event.preventDefault()
        startTransition(() => {
          void logoutAction()
        })
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : <LogOut />}
      {pending ? 'جارٍ تسجيل الخروج...' : 'تسجيل الخروج'}
    </DropdownMenuItem>
  )
}
