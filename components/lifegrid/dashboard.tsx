'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createInitialState, dispatchResponder, simulateTick, TARGET_AFFECTED_RATIO, TICK_MS } from '@/lib/lifegrid/simulation'
import { Navbar } from './navbar'
import { StatsCards } from './stats-cards'
import { StatusDonut } from './status-donut'
import { AlertFeed } from './alert-feed'
import { MapView, type FocusRequest } from './map-view'
import { PatientTable } from './patient-table'
import { EmergencyOps } from './emergency-ops'

export function Dashboard() {
  const [state, setState] = useState(() => createInitialState(Date.now()))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)
  const mapSectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => simulateTick(s, Date.now()))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  const handleDispatch = useCallback((id: string) => {
    setState((s) => dispatchResponder(s, id, Date.now()))
  }, [])

  const handleDetails = useCallback((id: string) => {
    setSelectedId(id)
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleFocusAmbulance = useCallback((ambulanceId: string) => {
    setSelectedId(null)
    setFocusRequest((f) => ({ ambulanceId, nonce: (f?.nonce ?? 0) + 1 }))
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const { patients, outages, ambulances, events, lastTick } = state
  const dangerCount = useMemo(() => patients.filter((p) => p.status === 'danger').length, [patients])

  return (
    <div className="min-h-screen">
      <Navbar patientCount={patients.length} dangerCount={dangerCount} lastTick={lastTick} />

      <main className="flex flex-col gap-4 p-4">
        <section
          ref={mapSectionRef}
          aria-label="Live overview"
          className="grid scroll-mt-20 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] 2xl:grid-cols-[320px_1fr_360px]"
        >
          <aside className="flex flex-col gap-4" aria-label="Oxygen patient statistics">
            <StatsCards patients={patients} outages={outages} ambulances={ambulances} />
            <StatusDonut patients={patients} />
          </aside>

          <MapView
            patients={patients}
            outages={outages}
            ambulances={ambulances}
            selectedId={selectedId}
            focusRequest={focusRequest}
            onSelect={setSelectedId}
            onDispatch={handleDispatch}
          />

          <aside
            className="grid grid-cols-1 gap-4 lg:col-span-2 lg:grid-cols-2 2xl:col-span-1 2xl:flex 2xl:flex-col"
            aria-label="Emergency operations and alerts"
          >
            <EmergencyOps ambulances={ambulances} patients={patients} onFocus={handleFocusAmbulance} />
            <AlertFeed events={events} />
          </aside>
        </section>

        <PatientTable
          patients={patients}
          selectedId={selectedId}
          onDispatch={handleDispatch}
          onDetails={handleDetails}
        />

        <footer className="rounded-xl border border-border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <strong className="font-semibold text-foreground">Competition demo — all data simulated.</strong> Patients,
          phone numbers, outages, ambulance positions and routes are fictional. Locations are approximate
          neighbourhood-level points in Greater Sfax, not real addresses. Routes are schematic visualisations, not
          real-time GPS. The {(TARGET_AFFECTED_RATIO * 100).toFixed(1)}% affected ratio is a simulation parameter, not
          a statistic about Sfax.
        </footer>
      </main>
    </div>
  )
}
