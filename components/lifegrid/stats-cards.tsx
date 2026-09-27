import { BatteryLow, Siren, Users, Zap, type LucideIcon } from 'lucide-react'
import type { Patient } from '@/lib/lifegrid/types'

interface StatCardProps {
  label: string
  value: string | number
  subtitle: string
  icon: LucideIcon
  tone: 'info' | 'danger' | 'warning' | 'safe'
  pulse?: boolean
}

const TONE: Record<StatCardProps['tone'], { text: string; bg: string }> = {
  info: { text: 'text-info', bg: 'bg-info/15' },
  danger: { text: 'text-danger', bg: 'bg-danger/15' },
  warning: { text: 'text-warning', bg: 'bg-warning/15' },
  safe: { text: 'text-safe', bg: 'bg-safe/15' },
}

function StatCard({ label, value, subtitle, icon: Icon, tone, pulse }: StatCardProps) {
  const t = TONE[tone]
  return (
    <div
      className={`rounded-xl border bg-card p-4 ${pulse ? 'lg-pulse-border border-danger/60' : 'border-border'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className={`flex size-8 items-center justify-center rounded-md ${t.bg} ${t.text}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-1 text-[2.5rem] font-bold leading-none tabular-nums ${t.text}`}>{value}</p>
      <p className="mt-2 text-xs text-muted-foreground text-pretty">{subtitle}</p>
    </div>
  )
}

export function StatsCards({ patients }: { patients: Patient[] }) {
  const danger = patients.filter((p) => p.status === 'danger')
  const cuts = patients.filter((p) => p.powerStatus === 'cut').length
  const avgBattery =
    danger.length > 0 ? Math.round(danger.reduce((sum, p) => sum + p.batteryPercent, 0) / danger.length) : null
  const batteryTone = avgBattery === null ? 'safe' : avgBattery < 30 ? 'danger' : avgBattery < 50 ? 'warning' : 'safe'

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="Total Patients" value={patients.length} subtitle="Registered home patients" icon={Users} tone="info" />
      <StatCard
        label="In Danger"
        value={danger.length}
        subtitle="Immediate intervention required"
        icon={Siren}
        tone="danger"
        pulse={danger.length > 0}
      />
      <StatCard label="Power Cuts" value={cuts} subtitle="Homes without power now" icon={Zap} tone="warning" />
      <StatCard
        label="Avg Battery"
        value={avgBattery === null ? '—' : `${avgBattery}%`}
        subtitle="Average remaining — critical group"
        icon={BatteryLow}
        tone={batteryTone}
      />
    </div>
  )
}
