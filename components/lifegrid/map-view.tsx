'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Patient } from '@/lib/lifegrid/types'

interface MapViewProps {
  patients: Patient[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onDispatch: (id: string) => void
}

const TUNISIA_CENTER: L.LatLngExpression = [33.8869, 9.5375]
const DEFAULT_ZOOM = typeof window !== 'undefined' && window.innerWidth >= 1280 ? 7 : 6
const STATUS_COLOR = { danger: '#ef4444', warning: '#f59e0b', stable: '#22c55e' } as const
const ALERT_LABEL = { SAMU: 'SAMU', caregiver: 'Caregiver', family: 'Family', none: 'None' } as const

function markerIcon(p: Patient, selected: boolean) {
  const size = p.status === 'danger' ? 18 : 16
  return L.divIcon({
    className: '',
    html: `<span class="lg-marker lg-${p.status}${selected ? ' lg-selected' : ''}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

function row(label: string, value: string) {
  return `<div style="display:flex;justify-content:space-between;gap:16px"><span style="color:#94a3b8">${label}</span><span style="font-weight:600;text-align:right">${value}</span></div>`
}

function popupHtml(p: Patient) {
  const color = STATUS_COLOR[p.status]
  const power =
    p.powerStatus === 'cut'
      ? `<span style="color:#ef4444">CUT since ${p.minutesWithoutPower} min</span>`
      : `<span style="color:#22c55e">ON</span>`
  const button = p.responderDispatched
    ? `<div style="margin-top:10px;padding:8px;border-radius:6px;background:rgb(59 130 246 / 0.15);color:#93c5fd;text-align:center;font-weight:600">${
        p.responderETA === 0 ? 'Responder on site' : `Responder en route · ETA ${p.responderETA} min`
      }</div>`
    : `<button type="button" data-dispatch="${p.id}" style="margin-top:10px;width:100%;padding:8px;border-radius:6px;background:#ef4444;color:#fff;font-weight:700;letter-spacing:0.04em;cursor:pointer;border:0">DISPATCH RESPONDER</button>`

  return `
    <div style="min-width:240px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px">
        <div>
          <div style="font-size:14px;font-weight:700">${p.name} — Age ${p.age}</div>
          <div style="color:#94a3b8;font-size:11px">${p.id} · ${p.city}</div>
        </div>
        <span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:0.08em;color:${color};background:${color}22;border:1px solid ${color}66">${p.status.toUpperCase()}</span>
      </div>
      ${row('Machine', p.machine)}
      ${row('Battery', `${p.batteryPercent}% (${p.batteryMinutesRemaining} min remaining)`)}
      ${row('Power', power)}
      ${row('Priority Score', `${p.priorityScore}/100`)}
      ${row('Alert Level', ALERT_LABEL[p.alertLevel])}
      <div style="margin-top:6px;padding-top:6px;border-top:1px solid #334155">
        ${row('Emergency Contact', p.emergencyContact)}
        ${row('Phone', p.emergencyPhone)}
      </div>
      ${button}
    </div>`
}

export function MapView({ patients, selectedId, onSelect, onDispatch }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef(new Map<string, { marker: L.Marker; key: string }>())
  const onDispatchRef = useRef(onDispatch)
  const onSelectRef = useRef(onSelect)
  onDispatchRef.current = onDispatch
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: TUNISIA_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 5,
      zoomControl: true,
      attributionControl: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

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
    return () => {
      map.remove()
      mapRef.current = null
      markers.clear()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers = markersRef.current

    for (const p of patients) {
      const selected = p.id === selectedId
      const iconKey = `${p.status}-${selected}`
      const existing = markers.get(p.id)
      if (!existing) {
        const marker = L.marker([p.lat, p.lng], {
          icon: markerIcon(p, selected),
          zIndexOffset: p.status === 'danger' ? 1000 : 0,
          title: `${p.name} — ${p.status}`,
        })
          .bindPopup(popupHtml(p), { maxWidth: 320 })
          .on('click', () => onSelectRef.current(p.id))
          .addTo(map)
        markers.set(p.id, { marker, key: iconKey })
      } else {
        if (existing.key !== iconKey) {
          existing.marker.setIcon(markerIcon(p, selected))
          existing.marker.setZIndexOffset(p.status === 'danger' ? 1000 : 0)
          existing.key = iconKey
        }
        existing.marker.setPopupContent(popupHtml(p))
      }
    }
  }, [patients, selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId) return
    const entry = markersRef.current.get(selectedId)
    if (!entry) return
    const latlng = entry.marker.getLatLng()
    if (map.getZoom() < 9 || !map.getBounds().contains(latlng)) {
      map.flyTo(latlng, 9, { duration: 0.8 })
      map.once('moveend', () => entry.marker.openPopup())
    } else {
      entry.marker.openPopup()
    }
  }, [selectedId])

  return (
    <section
      aria-label="Map of patients across Tunisia"
      className="relative min-h-[640px] overflow-hidden rounded-xl border border-border bg-card"
    >
      <div ref={containerRef} className="lg-map absolute inset-0" />
      <div className="pointer-events-none absolute left-14 top-3 z-[500] flex items-center gap-3 rounded-lg border border-border bg-background/85 px-3 py-2 text-xs backdrop-blur">
        {(['danger', 'warning', 'stable'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5 capitalize text-muted-foreground">
            <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} aria-hidden="true" />
            {s}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          onSelect(null)
          mapRef.current?.closePopup()
          mapRef.current?.flyTo(TUNISIA_CENTER, DEFAULT_ZOOM, { duration: 0.8 })
        }}
        className="absolute right-3 top-3 z-[500] rounded-lg border border-border bg-background/85 px-3 py-2 text-xs font-medium text-foreground backdrop-blur hover:bg-card"
      >
        Reset view
      </button>
    </section>
  )
}
