'use client'

import { useEffect, useState } from 'react'
import { Bell, HeartPulse, RefreshCw } from 'lucide-react'
import { formatClock } from '@/lib/lifegrid/calculations'
import { TICK_MS } from '@/lib/lifegrid/simulation'

interface NavbarProps {
  patientCount: number
  dangerCount: number
  lastTick: number
}

export function Navbar({ patientCount, dangerCount, lastTick }: NavbarProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const nextSync = Math.max(0, Math.ceil((TICK_MS - (now - lastTick)) / 1000))

  return (
    <header className="sticky top-0 z-[1000] border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-6 px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-danger/15 text-danger">
              <HeartPulse className="size-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight">LifeGrid</span>
          </div>
          <span className="flex items-center gap-1.5 rounded-md border border-danger/40 bg-danger/10 px-2 py-0.5 text-xs font-semibold tracking-widest text-danger">
            <span className="lg-live-dot size-2 rounded-full bg-danger" aria-hidden="true" />
            LIVE
          </span>
          <span className="hidden rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold tracking-widest text-muted-foreground sm:inline">
            SIMULATION
          </span>
        </div>

        <div className="hidden flex-col items-center md:flex">
          <h1 className="text-sm font-semibold tracking-wide text-foreground">
            Sfax Oxygen Patient Emergency Operations
          </h1>
          <p className="text-xs text-muted-foreground">
            Greater Sfax, Tunisia · {patientCount} home oxygen patients · Simulated demo data
          </p>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <RefreshCw className="size-3.5" aria-hidden="true" />
            <span>
              Sync in <span className="font-mono text-foreground">{nextSync}s</span>
            </span>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-semibold tabular-nums leading-none" aria-live="off">
              {formatClock(now, true)}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Last updated {formatClock(lastTick, true)}
            </div>
          </div>
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
              dangerCount > 0 ? 'border-danger/50 bg-danger/10 text-danger' : 'border-border text-muted-foreground'
            }`}
            role="status"
            aria-label={`${dangerCount} critical oxygen patients`}
          >
            <Bell className="size-4" aria-hidden="true" />
            <span className="tabular-nums">{dangerCount}</span>
            <span className="hidden lg:inline">Critical</span>
          </div>
        </div>
      </div>
    </header>
  )
}
