'use client'

import { useState } from 'react'
import { Plus, Pencil, Wallet, Landmark } from 'lucide-react'
import { AccountDialog } from './account-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import { formatMoney } from '@/lib/utils'

type Account = {
  id: string
  name: string
  account_type: string
  bank_name: string | null
  account_number: string | null
  iban: string | null
  opening_balance: string | number
  inflow: number
  outflow: number
  balance: number
}

type Props = {
  accounts: Account[]
  canCreate: boolean
  canUpdate: boolean
  currencySymbol: string
}

export function AccountsView({ accounts, canCreate, canUpdate, currencySymbol }: Props) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, string | null> | null>(null)

  return (
    <>
      <div className="mb-4 flex items-center justify-between no-print">
        <h2 className="font-semibold">الصندوق والحسابات البنكية</h2>
        {canCreate ? (
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="size-4" />
            إضافة حساب
          </Button>
        ) : null}
      </div>

      {accounts.length === 0 ? (
        <EmptyState icon="Wallet" title="لا توجد حسابات"
                    description="أضف حساب الصندوق النقدي وحسابات المكتب البنكية." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <li key={account.id}>
              <Card>
                <CardContent className="pt-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="flex items-center gap-2.5">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-navy-200">
                        {account.account_type === 'bank'
                          ? <Landmark className="size-4" />
                          : <Wallet className="size-4" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{account.name}</span>
                        <Badge variant="outline" className="mt-0.5">
                          {account.account_type === 'bank' ? 'حساب بنكي' : 'صندوق نقدي'}
                        </Badge>
                      </span>
                    </span>

                    {canUpdate ? (
                      <Button
                        variant="ghost" size="icon"
                        aria-label={`تعديل ${account.name}`}
                        onClick={() => {
                          setEditing({
                            id: account.id, name: account.name,
                            accountType: account.account_type,
                            bankName: account.bank_name,
                            accountNumber: account.account_number,
                            iban: account.iban,
                            openingBalance: String(account.opening_balance),
                          })
                          setOpen(true)
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    ) : null}
                  </div>

                  {account.bank_name || account.iban ? (
                    <div className="mb-3 space-y-0.5 text-xs text-muted-foreground">
                      {account.bank_name ? <p>{account.bank_name}</p> : null}
                      {account.iban ? (
                        <p dir="ltr" className="tabular truncate" style={{ textAlign: 'start' }}>
                          {account.iban}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <dl className="space-y-1.5 border-t border-border pt-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">الرصيد الافتتاحي</dt>
                      <dd className="tabular">
                        {formatMoney(account.opening_balance, currencySymbol)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">الوارد</dt>
                      <dd className="tabular text-emerald-700 dark:text-emerald-400">
                        + {formatMoney(account.inflow, currencySymbol)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">الصادر</dt>
                      <dd className="tabular text-danger">
                        − {formatMoney(account.outflow, currencySymbol)}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5 font-bold">
                      <dt>الرصيد الحالي</dt>
                      <dd className="tabular">{formatMoney(account.balance, currencySymbol)}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <AccountDialog open={open} onOpenChange={setOpen} defaults={editing} />
    </>
  )
}
