'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Ambulance, CheckCircle2, Eye, Zap } from 'lucide-react'
import type { AlertLevel, Patient, PatientStatus } from '@/lib/lifegrid/types'

type SortKey =
  | 'id'
  | 'name'
  | 'area'
  | 'outage'
  | 'status'
  | 'power'
  | 'battery'
  | 'timeCut'
  | 'priority'
  | 'alert'

const STATUS_RANK: Record<PatientStatus, number> = { danger: 3, warning: 2, stable: 1 }
const ALERT_RANK: Record<AlertLevel, number> = { SAMU: 3, caregiver: 2, family: 1, none: 0 }

const SORTERS: Record<SortKey, (p: Patient) => number | string> = {
  id: (p) => p.id,
  name: (p) => p.name,
  area: (p) => p.area,
  outage: (p) => p.outageId ?? '',
  status: (p) => STATUS_RANK[p.status],
  power: (p) => (p.powerStatus === 'cut' ? 1 : 0),
  battery: (p) => p.batteryPercent,
  timeCut: (p) => p.minutesWithoutPower,
  priority: (p) => p.priorityScore,
  alert: (p) => ALERT_RANK[p.alertLevel],
}

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: 'id', label: '#' },
  { key: 'name', label: 'Patient' },
  { key: 'area', label: 'Area' },
  { key: 'outage', label: 'Outage zone' },
  { key: 'status', label: 'Status' },
  { key: 'power', label: 'Power' },
  { key: 'battery', label: 'O2 battery', className: 'w-44' },
  { key: 'timeCut', label: 'Without power' },
  { key: 'priority', label: 'Priority' },
  { key: 'alert', label: 'Alert' },
]

const STATUS_LABEL: Record<PatientStatus, string> = { danger: 'CRITICAL', warning: 'AT RISK', stable: 'STABLE' }

const STATUS_BADGE: Record<PatientStatus, string> = {
  danger: 'border-danger/50 bg-danger/15 text-danger',
  warning: 'border-warning/50 bg-warning/15 text-warning',
  stable: 'border-safe/50 bg-safe/15 text-safe',
}

const ALERT_BADGE: Record<AlertLevel, { label: string; className: string }> = {
  SAMU: { label: 'SAMU', className: 'bg-danger text-white' },
  caregiver: { label: 'Caregiver', className: 'bg-warning/20 text-warning' },
  family: { label: 'Family', className: 'bg-info/20 text-blue-300' },
  none: { label: 'None', className: 'bg-muted text-muted-foreground' },
}

function batteryColor(pct: number) {
  if (pct < 30) return 'bg-danger'
  if (pct < 60) return 'bg-warning'
  return 'bg-safe'
}

function priorityColor(score: number) {
  if (score > 70) return 'text-danger'
  if (score >= 40) return 'text-warning'
  return 'text-safe'
}

interface PatientTableProps {
  patients: Patient[]
  selectedId: string | null
  onDispatch: (id: string) => void
  onDetails: (id: string) => void
}

export function PatientTable({ patients, selectedId, onDispatch, onDetails }: PatientTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'priority', dir: 'desc' })

  const sorted = useMemo(() => {
    const get = SORTERS[sort.key]
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...patients].sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
      return cmp !== 0 ? cmp * factor : b.priorityScore - a.priorityScore
    })
  }, [patients, sort])

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }))

  return (
    <section aria-labelledby="patient-table-title" className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 id="patient-table-title" className="text-sm font-semibold">
            Oxygen patient triage queue
          </h2>
          <p className="text-xs text-muted-foreground">
            Priority = 30 outage base + 0.4 × battery deficit + 0.8 × minutes without power (max 30) + low-support
            bonus − 10 if ambulance assigned
          </p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          Sorted by {COLUMNS.find((c) => c.key === sort.key)?.label} ({sort.dir})
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              {COLUMNS.map((col) => {
                const active = sort.key === col.key
                const Icon = !active ? ArrowUpDown : sort.dir === 'desc' ? ArrowDown : ArrowUp
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none'}
                    className={`px-3 py-2.5 font-medium ${col.className ?? ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 hover:text-foreground ${active ? 'text-foreground' : ''}`}
                    >
                      {col.label}
                      <Icon className="size-3" aria-hidden="true" />
                    </button>
                  </th>
                )
              })}
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const alert = ALERT_BADGE[p.alertLevel]
              const rowTint =
                p.status === 'danger' ? 'bg-danger/[0.07]' : p.status === 'warning' ? 'bg-warning/[0.06]' : ''
              return (
                <tr
                  key={p.id}
                  className={`border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/60 ${rowTint} ${
                    selectedId === p.id ? 'outline outline-1 -outline-offset-1 outline-info' : ''
                  }`}
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{p.id}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.age} yrs</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div>{p.area}</div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Greater Sfax</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {p.outageId ? (
                      <span className="rounded border border-warning/50 bg-warning/10 px-1.5 py-0.5 font-mono text-[11px] text-warning">
                        {p.outageId}
                      </span>
                    ) : p.nearOutage ? (
                      <span className="text-xs text-warning">Near outage</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-bold tracking-wider ${STATUS_BADGE[p.status]}`}
                    >
                      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {p.powerStatus === 'cut' ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-danger">
                        <Zap className="size-3.5" aria-hidden="true" /> CUT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-safe">
                        <CheckCircle2 className="size-3.5" aria-hidden="true" /> ON
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 flex-1 overflow-hidden rounded-full bg-background"
                        role="progressbar"
                        aria-valuenow={p.batteryPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Battery ${p.batteryPercent}%`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${batteryColor(p.batteryPercent)}`}
                          style={{ width: `${p.batteryPercent}%` }}
                        />
                      </div>
                      <span className="w-9 text-right font-mono text-xs tabular-nums">{p.batteryPercent}%</span>
                    </div>
                    {p.powerStatus === 'cut' && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {p.oxygenBackup === 'cylinder'
                          ? 'Portable O2 cylinder on site'
                          : `${p.batteryMinutesRemaining} min oxygen support left`}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs tabular-nums">
                    {p.powerStatus === 'cut' ? `${p.minutesWithoutPower} min ago` : '—'}
                  </td>
                  <td className={`px-3 py-2.5 text-base font-bold tabular-nums ${priorityColor(p.priorityScore)}`}>
                    {p.priorityScore}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${alert.className}`}>
                      {alert.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      {p.responderDispatched ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-info/15 px-2.5 py-1.5 text-xs font-medium text-blue-300">
                          <Ambulance className="size-3.5" aria-hidden="true" />
                          {p.responderId} · {p.responderETA === 0 ? 'On scene' : `ETA ${p.responderETA}m`}
                        </span>
                      ) : p.powerStatus === 'on' ? (
                        <span className="px-2.5 text-xs text-muted-foreground">Grid OK</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onDispatch(p.id)}
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                            p.status === 'danger'
                              ? 'bg-danger text-white hover:bg-danger/85'
                              : 'border border-border text-foreground hover:bg-secondary'
                          }`}
                        >
                          <Ambulance className="size-3.5" aria-hidden="true" />
                          Dispatch
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDetails(p.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Eye className="size-3.5" aria-hidden="true" />
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
