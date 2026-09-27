'use client'

import { useEffect, useRef } from 'react'
import {
  Ambulance,
  CheckCircle2,
  MessageSquare,
  PhoneCall,
  Siren,
  TriangleAlert,
  UserCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { formatClock } from '@/lib/lifegrid/calculations'
import type { AlertEvent, AlertEventKind } from '@/lib/lifegrid/types'

const KIND_STYLE: Record<AlertEventKind, { icon: LucideIcon; className: string }> = {
  samu: { icon: Siren, className: 'text-danger' },
  critical: { icon: TriangleAlert, className: 'text-danger' },
  caregiver: { icon: PhoneCall, className: 'text-warning' },
  family: { icon: MessageSquare, className: 'text-info' },
  cut: { icon: Zap, className: 'text-warning' },
  restored: { icon: CheckCircle2, className: 'text-safe' },
  dispatch: { icon: Ambulance, className: 'text-info' },
  arrived: { icon: UserCheck, className: 'text-safe' },
}

const VISIBLE_EVENTS = 6

export function AlertFeed({ events }: { events: AlertEvent[] }) {
  const listRef = useRef<HTMLOListElement>(null)
  const latestId = events[0]?.id

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [latestId])

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Alert feed</h2>
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
