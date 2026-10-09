'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ShieldCheck } from 'lucide-react'
import { acceptTermsAction } from '../actions'
import { Button } from '@/components/ui/button'

/** يظهر لمدير المكتب حتى يوافق على الإصدار الحالي من سياسة الخصوصية. */
export function TermsNotice() {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[var(--radius-app)] border border-gold-500/40 bg-gold-500/10 px-4 py-3 text-sm">
      <ShieldCheck className="size-5 shrink-0 text-gold-600" />
      <p className="min-w-0 flex-1 leading-relaxed">
        نشرنا <Link href="/privacy" target="_blank" className="font-medium underline underline-offset-4">سياسة الخصوصية وشروط الاستخدام</Link>:
        بيانات مكتبك ملكك، ولا نطّلع عليها ولا نشاركها. اطّلع عليها ووافق ليُحفظ ذلك في سجل مكتبك.
      </p>
      <Button size="sm" disabled={pending} onClick={() => start(async () => {
        const r = await acceptTermsAction()
        if (r.ok) toast.success(r.message)
        else toast.error(r.error)
        router.refresh()
      })}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null} قرأتها وأوافق
      </Button>
    </div>
  )
}
