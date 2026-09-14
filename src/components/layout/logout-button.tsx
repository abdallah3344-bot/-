'use client'

import { useTransition } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { logoutAction } from '@/modules/auth/actions'
import { Button } from '@/components/ui/button'

/** تسجيل خروج مستقل عن القائمة المنسدلة — تستخدمه صفحة التفعيل. */
export function LogoutButton() {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => void logoutAction())}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      تسجيل الخروج
    </Button>
  )
}
