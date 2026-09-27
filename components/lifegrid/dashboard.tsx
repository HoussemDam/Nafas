'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createInitialState, dispatchResponder, simulateTick, TICK_MS } from '@/lib/lifegrid/simulation'
import { Navbar } from './navbar'
import { StatsCards } from './stats-cards'
import { StatusDonut } from './status-donut'
import { AlertFeed } from './alert-feed'
import { MapView } from './map-view'
import { PatientTable } from './patient-table'

export function Dashboard() {
  const [state, setState] = useState(() => createInitialState(Date.now()))
  const [selectedId, setSelectedId] = useState<string | null>(null)
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

  const { patients, events, lastTick } = state
  const dangerCount = useMemo(() => patients.filter((p) => p.status === 'danger').length, [patients])

  return (
    <div className="min-h-screen">
      <Navbar patientCount={patients.length} dangerCount={dangerCount} lastTick={lastTick} />

      <main className="flex flex-col gap-4 p-4">
        <section
          ref={mapSectionRef}
          aria-label="Live overview"
          className="grid scroll-mt-20 grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]"
        >
          <aside className="flex flex-col gap-4" aria-label="System statistics and alerts">
            <StatsCards patients={patients} />
            <StatusDonut patients={patients} />
            <AlertFeed events={events} />
          </aside>

          <MapView
            patients={patients}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDispatch={handleDispatch}
          />
        </section>

        <PatientTable
          patients={patients}
          selectedId={selectedId}
          onDispatch={handleDispatch}
          onDetails={handleDetails}
        />
      </main>
    </div>
  )
}
