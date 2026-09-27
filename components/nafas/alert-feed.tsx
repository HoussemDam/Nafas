'use client'

import { useEffect, useRef } from 'react'
import {
  Ambulance,
  BatteryLow,
  CheckCircle2,
  CircleSlash,
  MessageSquare,
  Navigation,
  PhoneCall,
  Siren,
  TriangleAlert,
  Undo2,
  UserCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { formatClock } from '@/lib/nafas/calculations'
import type { AlertEvent, AlertEventKind } from '@/lib/nafas/types'

const KIND_STYLE: Record<AlertEventKind, { icon: LucideIcon; className: string }> = {
  outage: { icon: Zap, className: 'text-warning' },
  outage_restored: { icon: CheckCircle2, className: 'text-safe' },
  samu: { icon: Siren, className: 'text-danger' },
  critical: { icon: TriangleAlert, className: 'text-danger' },
  battery: { icon: BatteryLow, className: 'text-warning' },
  caregiver: { icon: PhoneCall, className: 'text-warning' },
  family: { icon: MessageSquare, className: 'text-info' },
  dispatch: { icon: Ambulance, className: 'text-info' },
  enroute: { icon: Navigation, className: 'text-info' },
  onscene: { icon: UserCheck, className: 'text-safe' },
  returning: { icon: Undo2, className: 'text-muted-foreground' },
  busy: { icon: CircleSlash, className: 'text-danger' },
}

const VISIBLE_EVENTS = 10

export function AlertFeed({ events }: { events: AlertEvent[] }) {
  const listRef = useRef<HTMLOListElement>(null)
  const latestId = events[0]?.id

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [latestId])

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Oxygen alert feed</h2>
        <span className="font-mono text-[11px] text-muted-foreground">{events.length} events logged</span>
      </div>
      <ol
        ref={listRef}
        className="max-h-64 overflow-y-auto font-mono text-[11.5px] leading-relaxed"
        aria-live="polite"
        aria-label="Most recent alert events"
      >
        {events.slice(0, VISIBLE_EVENTS).map((e) => {
          const { icon: Icon, className } = KIND_STYLE[e.kind]
          return (
            <li key={e.id} className="lg-slide-in flex gap-2 border-b border-border/60 px-4 py-2 last:border-0">
              <span className="shrink-0 text-muted-foreground">[{formatClock(e.time)}]</span>
              <Icon className={`mt-0.5 size-3.5 shrink-0 ${className}`} aria-hidden="true" />
              <span className="text-foreground/90">{e.message}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
