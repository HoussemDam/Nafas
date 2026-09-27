import { Ambulance as AmbulanceIcon, BatteryLow, Siren, Users, Zap, ZapOff, type LucideIcon } from 'lucide-react'
import type { Ambulance, OutageZone, Patient } from '@/lib/lifegrid/types'

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
    <div className={`rounded-xl border bg-card p-3.5 ${pulse ? 'lg-pulse-border border-danger/60' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase leading-tight tracking-wider text-muted-foreground">{label}</p>
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-md ${t.bg} ${t.text}`}>
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-1 text-3xl font-bold leading-none tabular-nums ${t.text}`}>{value}</p>
      <p className="mt-1.5 text-[11px] text-muted-foreground text-pretty">{subtitle}</p>
    </div>
  )
}

interface StatsCardsProps {
  patients: Patient[]
  outages: OutageZone[]
  ambulances: Ambulance[]
}

export function StatsCards({ patients, outages, ambulances }: StatsCardsProps) {
  const affected = patients.filter((p) => p.powerStatus === 'cut')
  const critical = patients.filter((p) => p.status === 'danger').length
  const affectedPct = patients.length > 0 ? ((affected.length / patients.length) * 100).toFixed(1) : '0'
  const avgBattery =
    affected.length > 0 ? Math.round(affected.reduce((sum, p) => sum + p.batteryPercent, 0) / affected.length) : null
  const batteryTone = avgBattery === null ? 'safe' : avgBattery < 30 ? 'danger' : avgBattery < 50 ? 'warning' : 'safe'
  const enRoute = ambulances.filter((a) => a.status === 'en_route').length

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="Total oxygen patients" value={patients.length} subtitle="Home concentrators monitored" icon={Users} tone="info" />
      <StatCard
        label="In active outage"
        value={affected.length}
        subtitle={`${affectedPct}% of monitored patients`}
        icon={ZapOff}
        tone="warning"
      />
      <StatCard
        label="Critical oxygen patients"
        value={critical}
        subtitle="Battery below 30%, no backup"
        icon={Siren}
        tone="danger"
        pulse={critical > 0}
      />
      <StatCard
        label="Avg battery (affected)"
        value={avgBattery === null ? '—' : `${avgBattery}%`}
        subtitle="Concentrator backup remaining"
        icon={BatteryLow}
        tone={batteryTone}
      />
      <StatCard
        label="Ambulances en route"
        value={enRoute}
        subtitle={`${ambulances.filter((a) => a.status === 'available').length} of ${ambulances.length} available`}
        icon={AmbulanceIcon}
        tone="info"
      />
      <StatCard
        label="Active outage zones"
        value={outages.length}
        subtitle={outages.map((o) => o.id).join(' · ') || 'Grid stable'}
        icon={Zap}
        tone={outages.length > 0 ? 'warning' : 'safe'}
      />
    </div>
  )
}
