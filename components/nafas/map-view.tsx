'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { pointAlongRoute, splitRoute } from '@/lib/nafas/geo'
import type { Ambulance, OutageZone, Patient } from '@/lib/nafas/types'
import { MapLegend } from './map-legend'

export interface FocusRequest {
  ambulanceId: string
  nonce: number
}

interface MapViewProps {
  patients: Patient[]
  outages: OutageZone[]
  ambulances: Ambulance[]
  selectedId: string | null
  focusRequest: FocusRequest | null
  onSelect: (id: string | null) => void
  onDispatch: (id: string) => void
}

const STATUS_COLOR = { danger: '#ef4444', warning: '#f59e0b', stable: '#22c55e' } as const
const STATUS_LABEL = { danger: 'CRITICAL', warning: 'AT RISK', stable: 'STABLE' } as const
const ALERT_LABEL = { SAMU: 'SAMU', caregiver: 'Caregiver', family: 'Family', none: 'None' } as const
const TWEEN_MS = 1400

const AMBULANCE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 10H6"/><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14"/><path d="M8 8v4"/><path d="M9 18h6"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>'

function patientIcon(p: Patient, selected: boolean, targeted: boolean) {
  const size = p.status === 'danger' ? 18 : 16
  const classes = ['lg-marker', `lg-${p.status}`, selected && 'lg-selected', targeted && 'lg-target']
    .filter(Boolean)
    .join(' ')
  return L.divIcon({
    className: '',
    html: `<span class="${classes}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

function ambulanceIcon(a: Ambulance) {
  return L.divIcon({
    className: '',
    html: `<span class="lg-amb lg-amb-${a.status}">${AMBULANCE_SVG}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

const baseIcon = L.divIcon({
  className: '',
  html: '<span class="lg-base">H</span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function ambulanceLabel(a: Ambulance) {
  if (a.status === 'en_route') return `${a.id} · ETA ${String(a.eta ?? 0).padStart(2, '0')} min`
  if (a.status === 'on_scene') return `${a.id} · ON SCENE`
  if (a.status === 'returning') return `${a.id} · returning`
  return a.id
}

function row(label: string, value: string) {
  return `<div style="display:flex;justify-content:space-between;gap:16px"><span style="color:#94a3b8">${label}</span><span style="font-weight:600;text-align:right">${value}</span></div>`
}

function popupHtml(p: Patient) {
  const color = STATUS_COLOR[p.status]
  const power =
    p.powerStatus === 'cut'
      ? `<span style="color:#ef4444">CUT · ${p.outageId} · ${p.minutesWithoutPower} min</span>`
      : `<span style="color:#22c55e">ON${p.nearOutage ? ' · near outage' : ''}</span>`
  const support =
    p.oxygenBackup === 'cylinder'
      ? 'Portable cylinder on site'
      : `${p.batteryPercent}% · ${p.batteryMinutesRemaining} min`
  let action: string
  if (p.responderDispatched) {
    const text =
      p.responderETA === 0 ? `${p.responderId} on scene` : `${p.responderId} en route · ETA ${p.responderETA} min`
    action = `<div style="margin-top:10px;padding:8px;border-radius:6px;background:rgb(59 130 246 / 0.15);color:#93c5fd;text-align:center;font-weight:600">${text}</div>`
  } else if (p.powerStatus === 'cut') {
    action = `<button type="button" data-dispatch="${p.id}" style="margin-top:10px;width:100%;padding:8px;border-radius:6px;background:#ef4444;color:#fff;font-weight:700;letter-spacing:0.04em;cursor:pointer;border:0">DISPATCH RESPONDER</button>`
  } else {
    action = ''
  }

  return `
    <div style="min-width:250px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px">
        <div>
          <div style="font-size:14px;font-weight:700">${p.name} — Age ${p.age}</div>
          <div style="color:#94a3b8;font-size:11px">${p.id} · ${p.area} (approx.)</div>
        </div>
        <span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:0.08em;color:${color};background:${color}22;border:1px solid ${color}66">${STATUS_LABEL[p.status]}</span>
      </div>
      ${row('Device', p.machine)}
      ${row('Oxygen support', support)}
      ${row('Grid power', power)}
      ${row('Priority', `${p.priorityScore}/100`)}
      ${row('Alert level', ALERT_LABEL[p.alertLevel])}
      <div style="margin-top:6px;padding-top:6px;border-top:1px solid #334155">
        ${row('Emergency contact', p.emergencyContact)}
        ${row('Phone', p.emergencyPhone)}
      </div>
      ${action}
    </div>`
}

type AmbLayer = {
  marker: L.Marker
  travelled: L.Polyline
  remaining: L.Polyline
  routeKey: string
  shownKm: number
  iconKey: string
  raf: number | null
}

function boundsOfPatients(patients: Patient[]) {
  return L.latLngBounds(patients.map((p) => [p.lat, p.lng] as L.LatLngTuple))
}

export function MapView({
  patients,
  outages,
  ambulances,
  selectedId,
  focusRequest,
  onSelect,
  onDispatch,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef(new Map<string, { marker: L.Marker; key: string }>())
  const outagesRef = useRef(new Map<string, L.Circle>())
  const ambRef = useRef(new Map<string, AmbLayer>())
  const homeBoundsRef = useRef<L.LatLngBounds | null>(null)
  const onDispatchRef = useRef(onDispatch)
  const onSelectRef = useRef(onSelect)
  onDispatchRef.current = onDispatch
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true, minZoom: 9 })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    homeBoundsRef.current = boundsOfPatients(patients)
    map.fitBounds(homeBoundsRef.current, { padding: [40, 40] })

    map.on('popupopen', (e) => {
      const el = e.popup.getElement()
      if (!el || el.dataset.bound) return
      el.dataset.bound = 'true'
      el.addEventListener('click', (ev) => {
        const btn = (ev.target as HTMLElement).closest<HTMLElement>('[data-dispatch]')
        if (!btn?.dataset.dispatch) return
        ev.stopPropagation()
        const id = btn.dataset.dispatch
        // Defer so the button isn't removed mid-event, which Leaflet treats as an outside click.
        setTimeout(() => onDispatchRef.current(id), 0)
      })
    })

    mapRef.current = map
    const markers = markersRef.current
    const outageLayers = outagesRef.current
    const ambLayers = ambRef.current
    return () => {
      for (const l of ambLayers.values()) if (l.raf) cancelAnimationFrame(l.raf)
      map.remove()
      mapRef.current = null
      markers.clear()
      outageLayers.clear()
      ambLayers.clear()
    }
    // Initial bounds only; later updates are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const layers = outagesRef.current
    const activeIds = new Set(outages.map((o) => o.id))
    for (const [id, circle] of layers) {
      if (!activeIds.has(id)) {
        circle.remove()
        layers.delete(id)
      }
    }
    for (const o of outages) {
      if (layers.has(o.id)) continue
      const circle = L.circle([o.centerLat, o.centerLng], {
        radius: o.radiusKm * 1000,
        color: '#f97316',
        weight: 1.5,
        dashArray: '6 6',
        fillColor: '#ef4444',
        fillOpacity: 0.14,
        className: 'lg-outage',
        interactive: false,
      })
        .bindTooltip(`${o.id} · ${o.name} · ${o.affectedPatients.length} patients`, {
          permanent: true,
          direction: 'top',
          className: 'lg-tip lg-tip-outage',
          offset: [0, -8],
        })
        .addTo(map)
      layers.set(o.id, circle)
    }
  }, [outages])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    for (const a of ambulances) {
      L.marker([a.baseLat, a.baseLng], { icon: baseIcon, interactive: false, keyboard: false }).addTo(map)
    }
    // Stations are static; draw once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const layers = ambRef.current

    for (const a of ambulances) {
      let layer = layers.get(a.id)
      if (!layer) {
        const travelled = L.polyline([], { color: '#60a5fa', weight: 3, opacity: 0.35, interactive: false }).addTo(map)
        const remaining = L.polyline([], {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.95,
          className: 'lg-route',
          interactive: false,
        }).addTo(map)
        const marker = L.marker([a.lat, a.lng], {
          icon: ambulanceIcon(a),
          zIndexOffset: 2000,
          title: `${a.id} — ${a.status}`,
          keyboard: false,
        })
          .bindTooltip(ambulanceLabel(a), { permanent: true, direction: 'right', offset: [14, 0], className: 'lg-tip lg-tip-amb' })
          .addTo(map)
        layer = { marker, travelled, remaining, routeKey: '', shownKm: a.progressKm, iconKey: '', raf: null }
        layers.set(a.id, layer)
      }

      const iconKey = a.status
      if (layer.iconKey !== iconKey) {
        layer.marker.setIcon(ambulanceIcon(a))
        layer.iconKey = iconKey
      }
      layer.marker.setTooltipContent(ambulanceLabel(a))
      const tooltipEl = layer.marker.getTooltip()?.getElement()
      tooltipEl?.classList.toggle('lg-tip-idle', a.status === 'available')

      const hasRoute = a.route.length > 1 && a.status !== 'available'
      const routeKey = hasRoute ? `${a.status}:${a.route[0].join()}:${a.route.at(-1)!.join()}` : ''
      if (layer.raf) cancelAnimationFrame(layer.raf)
      layer.remaining.getElement()?.classList.toggle('lg-route-return', a.status === 'returning')

      if (!hasRoute) {
        layer.routeKey = ''
        layer.travelled.setLatLngs([])
        layer.remaining.setLatLngs([])
        layer.marker.setLatLng([a.lat, a.lng])
        layer.shownKm = 0
        continue
      }

      const draw = (km: number) => {
        const [done, left] = splitRoute(a.route, km)
        layer!.travelled.setLatLngs(done)
        layer!.remaining.setLatLngs(a.status === 'on_scene' ? [] : left)
        layer!.marker.setLatLng(pointAlongRoute(a.route, km))
        layer!.shownKm = km
      }

      if (layer.routeKey !== routeKey) {
        layer.routeKey = routeKey
        draw(a.progressKm)
        continue
      }

      const fromKm = layer.shownKm
      const toKm = a.progressKm
      if (Math.abs(toKm - fromKm) < 0.001) {
        draw(toKm)
        continue
      }
      const start = performance.now()
      const step = (t: number) => {
        const k = Math.min(1, (t - start) / TWEEN_MS)
        const eased = 1 - (1 - k) ** 3
        draw(fromKm + (toKm - fromKm) * eased)
        layer!.raf = k < 1 ? requestAnimationFrame(step) : null
      }
      layer.raf = requestAnimationFrame(step)
    }
  }, [ambulances])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers = markersRef.current
    const targeted = new Set(
      ambulances.filter((a) => a.status === 'en_route' && a.assignedPatientId).map((a) => a.assignedPatientId),
    )

    for (const p of patients) {
      const selected = p.id === selectedId
      const isTarget = targeted.has(p.id)
      const iconKey = `${p.status}-${selected}-${isTarget}`
      const existing = markers.get(p.id)
      if (!existing) {
        const marker = L.marker([p.lat, p.lng], {
          icon: patientIcon(p, selected, isTarget),
          zIndexOffset: p.status === 'danger' ? 1000 : 0,
          title: `${p.name} — ${STATUS_LABEL[p.status].toLowerCase()}`,
        })
          .bindPopup(popupHtml(p), { maxWidth: 320 })
          .on('click', () => onSelectRef.current(p.id))
          .addTo(map)
        markers.set(p.id, { marker, key: iconKey })
      } else {
        if (existing.key !== iconKey) {
          existing.marker.setIcon(patientIcon(p, selected, isTarget))
          existing.marker.setZIndexOffset(p.status === 'danger' ? 1000 : 0)
          existing.key = iconKey
        }
        existing.marker.setPopupContent(popupHtml(p))
      }
    }
  }, [patients, ambulances, selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId) return
    const entry = markersRef.current.get(selectedId)
    if (!entry) return
    const latlng = entry.marker.getLatLng()
    if (map.getZoom() < 13 || !map.getBounds().contains(latlng)) {
      map.flyTo(latlng, 14, { duration: 0.8 })
      map.once('moveend', () => entry.marker.openPopup())
    } else {
      entry.marker.openPopup()
    }
  }, [selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !focusRequest) return
    const a = ambulances.find((x) => x.id === focusRequest.ambulanceId)
    if (!a) return
    map.closePopup()
    const points: L.LatLngTuple[] = a.route.length > 1 ? a.route.map((p) => [p[0], p[1]]) : [[a.lat, a.lng]]
    if (points.length === 1) map.flyTo(points[0], 14, { duration: 0.8 })
    else map.flyToBounds(L.latLngBounds(points), { padding: [70, 70], duration: 0.8, maxZoom: 15 })
    // Only react to explicit focus requests, not every ambulance tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest])

  return (
    <section
      aria-label="Map of oxygen patients, outage zones and ambulances in Greater Sfax"
      className="relative min-h-[560px] overflow-hidden rounded-xl border border-border bg-card lg:min-h-[640px]"
    >
      <div ref={containerRef} className="lg-map absolute inset-0" />
      <div className="pointer-events-none absolute left-14 top-3 z-[500] rounded-lg border border-border bg-background/85 px-3 py-2 backdrop-blur">
        <p className="text-xs font-semibold text-foreground">Greater Sfax — Operational area</p>
        <p className="text-[11px] text-muted-foreground">Simulated patients · approximate neighbourhood locations</p>
      </div>
      <button
        type="button"
        onClick={() => {
          onSelect(null)
          mapRef.current?.closePopup()
          if (homeBoundsRef.current) mapRef.current?.flyToBounds(homeBoundsRef.current, { padding: [40, 40], duration: 0.8 })
        }}
        className="absolute right-3 top-3 z-[500] rounded-lg border border-border bg-background/85 px-3 py-2 text-xs font-medium text-foreground backdrop-blur hover:bg-card"
      >
        Reset view
      </button>
      <MapLegend />
    </section>
  )
}
