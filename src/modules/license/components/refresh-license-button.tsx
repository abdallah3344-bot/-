'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { refreshLicenseAction } from '../actions'
import { Button } from '@/components/ui/button'

export function RefreshLicenseButton({ label = 'تحديث حالة الترخيص' }: { label?: string }) {
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)

  function run() {
    setBusy(true)
    startTransition(async () => {
      const result = await refreshLicenseAction()
      if (result.ok) toast.success(result.message ?? 'الترخيص سارٍ.')
      else toast.error(result.error)
      setBusy(false)
    })
  }

  const loading = pending || busy

  return (
    <Button type="button" variant="outline" size="sm" onClick={run} disabled={loading}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
      {label}
    </Button>
  )
}
