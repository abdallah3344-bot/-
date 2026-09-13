'use client'

import { useRouter } from 'next/navigation'
import { Archive, RotateCcw } from 'lucide-react'
import { reopenCaseAction } from '../actions'
import { CloseCaseDialog } from './close-case-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'

type Props = {
  caseId: string
  title: string
  isClosed: boolean
  canClose: boolean
  canReopen: boolean
}

export function CaseHeaderActions({ caseId, title, isClosed, canClose, canReopen }: Props) {
  const router = useRouter()

  if (!isClosed && canClose) {
    return (
      <CloseCaseDialog
        caseId={caseId}
        title={title}
        onDone={() => router.refresh()}
        trigger={
          <Button variant="outline">
            <Archive className="size-4" />
            إغلاق وأرشفة
          </Button>
        }
      />
    )
  }

  if (isClosed && canReopen) {
    return (
      <ConfirmDialog
        title="إعادة فتح القضية"
        description={`ستُعاد «${title}» إلى القضايا النشطة بحالة «قيد المتابعة».`}
        confirmLabel="إعادة الفتح"
        action={() => reopenCaseAction(caseId)}
        onDone={() => router.refresh()}
        trigger={
          <Button variant="outline">
            <RotateCcw className="size-4" />
            إعادة فتح
          </Button>
        }
      />
    )
  }

  return null
}
