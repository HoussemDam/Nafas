'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { Patient } from '@/lib/nafas/types'

const SEGMENTS = [
  { key: 'danger', label: 'Danger', color: '#ef4444' },
  { key: 'warning', label: 'Warning', color: '#f59e0b' },
  { key: 'stable', label: 'Stable', color: '#22c55e' },
] as const

export function StatusDonut({ patients }: { patients: Patient[] }) {
  const data = SEGMENTS.map((s) => ({
    ...s,
    value: patients.filter((p) => p.status === s.key).length,
  }))

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Triage distribution</h2>
      <div className="mt-2 flex items-center gap-4">
        <div className="relative size-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius="68%"
                outerRadius="100%"
                paddingAngle={3}
                stroke="none"
                isAnimationActive
                animationDuration={600}
              >
                {data.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: '#f1f5f9' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums">{patients.length}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">patients</span>
          </div>
        </div>
        <ul className="flex flex-1 flex-col gap-2">
          {data.map((d) => (
            <li key={d.key} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ background: d.color }} aria-hidden="true" />
                {d.label}
              </span>
              <span className="font-semibold tabular-nums">{d.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
