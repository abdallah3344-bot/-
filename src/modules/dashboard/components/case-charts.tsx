'use client'

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'
import { ChartTooltip, ChartLegend, useChartTheme } from '@/components/shared/chart-kit'
import { CASE_STATUS_LABELS, labelOf } from '@/lib/constants/enums'
import { formatMoney } from '@/lib/utils'

type Slice = { label: string; value: number; color?: string }
type FinanceRow = { label: string; income: number; expense: number }

type Props = {
  data: Record<string, unknown>
  showFinance: boolean
}

export function CaseCharts({ data, showFinance }: Props) {
  const theme = useChartTheme()

  const byType = (data.by_type ?? []) as Slice[]
  const byCourt = (data.by_court ?? []) as Slice[]
  const byStatus = ((data.by_status ?? []) as Slice[]).map((s) => ({
    ...s,
    label: labelOf(CASE_STATUS_LABELS, s.label),
  }))
  const hearingsMonthly = (data.hearings_monthly ?? []) as Slice[]
  const financeMonthly = (data.finance_monthly ?? []) as FinanceRow[]

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <RankedBars title="القضايا حسب النوع" rows={byType} theme={theme} useRowColor />
      <RankedBars title="القضايا حسب الحالة" rows={byStatus} theme={theme} />
      <RankedBars title="القضايا حسب المحكمة" rows={byCourt} theme={theme} />

      <Card>
        <CardHeader>
          <CardTitle>عدد الجلسات شهريًا</CardTitle>
        </CardHeader>
        <CardContent>
          {hearingsMonthly.length === 0 ? (
            <EmptyState icon="Gavel" title="لا توجد جلسات مسجّلة بعد" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={hearingsMonthly} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label" reversed
                  tick={{ fill: theme.text, fontSize: 11 }}
                  tickLine={false} axisLine={{ stroke: theme.grid }}
                />
                <YAxis
                  orientation="right" allowDecimals={false}
                  tick={{ fill: theme.text, fontSize: 11 }}
                  tickLine={false} axisLine={false} width={36}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: theme.grid }} />
                <Line
                  type="monotone" dataKey="value" name="الجلسات"
                  stroke={theme.series.primary} strokeWidth={2}
                  dot={{ r: 4, fill: theme.series.primary, stroke: theme.surface, strokeWidth: 2 }}
                  activeDot={{ r: 6, stroke: theme.surface, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {showFinance ? (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>الإيرادات والمصروفات — آخر 12 شهرًا</CardTitle>
          </CardHeader>
          <CardContent>
            {financeMonthly.length === 0 ? (
              <EmptyState icon="Wallet" title="لا توجد حركات مالية مسجّلة بعد" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={financeMonthly} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label" reversed
                      tick={{ fill: theme.text, fontSize: 11 }}
                      tickLine={false} axisLine={{ stroke: theme.grid }}
                    />
                    <YAxis
                      orientation="right"
                      tick={{ fill: theme.text, fontSize: 11 }}
                      tickLine={false} axisLine={false} width={64}
                      tickFormatter={(v: number) => v.toLocaleString('en-US')}
                    />
                    <Tooltip
                      content={<ChartTooltip formatter={(v) => formatMoney(v)} />}
                      cursor={{ fill: theme.grid, fillOpacity: 0.25 }}
                    />
                    <Bar dataKey="income" name="الإيرادات" fill={theme.series.primary}
                         radius={[4, 4, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="expense" name="المصروفات" fill={theme.series.secondary}
                         radius={[4, 4, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
                <ChartLegend
                  items={[
                    { label: 'الإيرادات', color: theme.series.primary },
                    { label: 'المصروفات', color: theme.series.secondary },
                  ]}
                />
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

/**
 * أعمدة أفقية مرتّبة تنازليًا.
 * الأسماء العربية طويلة، والاتجاه الأفقي يجعلها مقروءة بلا تدوير.
 * سلسلة واحدة ⇒ لا حاجة لوسيلة إيضاح، والعنوان يسمّيها.
 */
function RankedBars({
  title, rows, theme, useRowColor = false,
}: {
  title: string
  rows: Slice[]
  theme: ReturnType<typeof useChartTheme>
  useRowColor?: boolean
}) {
  const top = [...rows].sort((a, b) => b.value - a.value).slice(0, 8)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <EmptyState icon="Briefcase" title="لا توجد بيانات كافية بعد" />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, top.length * 34 + 40)}>
            <BarChart
              data={top}
              layout="vertical"
              margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
            >
              <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number" reversed allowDecimals={false}
                tick={{ fill: theme.text, fontSize: 11 }}
                tickLine={false} axisLine={false}
              />
              <YAxis
                type="category" dataKey="label" orientation="right" width={110}
                tick={{ fill: theme.text, fontSize: 11 }}
                tickLine={false} axisLine={false}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: theme.grid, fillOpacity: 0.25 }}
              />
              <Bar dataKey="value" name="عدد القضايا" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {top.map((row, i) => (
                  <Cell
                    key={i}
                    fill={useRowColor && row.color ? row.color : theme.series.primary}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
