'use client'

import { useRouter } from 'next/navigation'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

type Props = {
  clients: { id: string; name: string; client_no: string }[]
  selected: string | null
}

export function StatementPicker({ clients, selected }: Props) {
  const router = useRouter()

  return (
    <div className="max-w-md space-y-2">
      <Label htmlFor="statement-client">العميل</Label>
      <Select
        value={selected ?? undefined}
        onValueChange={(value) => router.push(`/accounts/statement?client=${value}`)}
      >
        <SelectTrigger id="statement-client">
          <SelectValue placeholder="اختر العميل لعرض كشف حسابه" />
        </SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name} — {client.client_no}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
