import { Ambulance, Zap } from 'lucide-react'

const DOTS = [
  { label: 'Critical oxygen patient', color: 'bg-danger' },
  { label: 'Oxygen patient at risk', color: 'bg-warning' },
  { label: 'Stable oxygen patient', color: 'bg-safe' },
]

export function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-6 left-3 z-[500] w-56 rounded-lg border border-border bg-background/90 p-3 text-[11px] backdrop-blur">
      <p className="mb-2 font-semibold uppercase tracking-wider text-muted-foreground">Legend</p>
      <ul className="flex flex-col gap-1.5 text-foreground/90">
        {DOTS.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${d.color}`} aria-hidden="true" />
            {d.label}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span
            className="flex size-3.5 items-center justify-center rounded-full border border-dashed border-orange-500 bg-danger/20"
            aria-hidden="true"
          >
            <Zap className="size-2 text-orange-400" />
          </span>
          Active power outage zone
        </li>
        <li className="flex items-center gap-2">
          <Ambulance className="size-3.5 text-info" aria-hidden="true" />
          Ambulance (simulated position)
        </li>
        <li className="flex items-center gap-2">
          <span className="h-0 w-3.5 border-t-2 border-dashed border-info" aria-hidden="true" />
          Ambulance route (schematic)
        </li>
        <li className="flex items-center gap-2">
          <span className="flex size-3.5 items-center justify-center rounded-sm bg-secondary text-[8px] font-bold text-foreground" aria-hidden="true">
            H
          </span>
          Ambulance station
        </li>
      </ul>
      <p className="mt-2 border-t border-border pt-2 leading-snug text-muted-foreground">
        Routes are simulated visualisations, not real-time GPS navigation.
      </p>
    </div>
  )
}
