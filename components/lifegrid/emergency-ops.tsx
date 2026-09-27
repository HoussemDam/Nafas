import { Ambulance as AmbulanceIcon, ChevronRight } from 'lucide-react'
import type { Ambulance, AmbulanceStatus, Patient } from '@/lib/lifegrid/types'

const STATUS: Record<AmbulanceStatus, { label: string; className: string }> = {
  en_route: { label: 'EN ROUTE', className: 'border-info/50 bg-info/15 text-blue-300' },
  on_scene: { label: 'ON SCENE', className: 'border-safe/50 bg-safe/15 text-safe' },
  returning: { label: 'RETURNING', className: 'border-border bg-secondary text-muted-foreground' },
  available: { label: 'AVAILABLE', className: 'border-border bg-secondary text-muted-foreground' },
}

const ORDER: Record<AmbulanceStatus, number> = { en_route: 0, on_scene: 1, returning: 2, available: 3 }

interface EmergencyOpsProps {
  ambulances: Ambulance[]
  patients: Patient[]
  onFocus: (ambulanceId: string) => void
}

export function EmergencyOps({ ambulances, patients, onFocus }: EmergencyOpsProps) {
  const sorted = [...ambulances].sort((a, b) => ORDER[a.status] - ORDER[b.status])
  const active = ambulances.filter((a) => a.status === 'en_route' || a.status === 'on_scene').length

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Emergency operations</h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          {active} active · {ambulances.filter((a) => a.status === 'available').length} available
        </span>
      </div>
      <ul className="flex flex-col">
        {sorted.map((a) => {
          const patient = patients.find((p) => p.id === a.assignedPatientId)
          const s = STATUS[a.status]
          const progress = a.routeLengthKm > 0 ? Math.round((a.progressKm / a.routeLengthKm) * 100) : 0
          return (
            <li key={a.id} className="border-b border-border/60 last:border-0">
              <button
                type="button"
                onClick={() => onFocus(a.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary/60"
                aria-label={`Focus map on ${a.id}`}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
                    a.status === 'en_route' ? 'bg-info/20 text-info' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  <AmbulanceIcon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{a.id}</span>
                    <span className={`rounded border px-1.5 py-px text-[10px] font-bold tracking-wider ${s.className}`}>
                      {s.label}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {patient
                      ? `→ ${patient.id} · ${patient.name} · ${patient.area}`
                      : a.status === 'returning'
                        ? `→ ${a.baseName}`
                        : a.baseName}
                  </span>
                  {a.status === 'en_route' && (
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-background" aria-hidden="true">
                        <span
                          className="block h-full rounded-full bg-info transition-all duration-1000 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-blue-300">
                        ETA {String(a.eta ?? 0).padStart(2, '0')} min
                      </span>
                    </span>
                  )}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
