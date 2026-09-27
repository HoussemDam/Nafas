import { recompute } from "./calculations"
import { distanceKm, pointAlongRoute, routeLength, schematicRoute } from "./geo"
import { createInitialPatients, INITIAL_OUTAGE_MINUTES } from "./patients"
import type {
  AlertEvent,
  AlertEventKind,
  AlertLevel,
  Ambulance,
  LatLng,
  OutageZone,
  Patient,
  SimulationState,
} from "./types"

/** One simulation tick = one simulated minute. */
export const TICK_MS = 6_000

/** Demo parameter: share of monitored patients the scenario targets as affected. Not a real-world statistic. */
export const TARGET_AFFECTED_RATIO = 0.425

const MAX_EVENTS = 50
const MAX_ACTIVE_OUTAGES = 2
const NEW_OUTAGE_CHANCE = 0.08
const AMBULANCE_KM_PER_MIN = 0.7
const MINUTES_ON_SCENE = 3
const AUTO_DISPATCH_SUPPORT_MINUTES = 10
const NEAR_OUTAGE_BUFFER_KM = 1.2

type NewEvent = Omit<AlertEvent, "id">

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const pad = (n: number) => String(n).padStart(2, "0")
const pos = (p: { lat: number; lng: number }): LatLng => [p.lat, p.lng]

const BASES: { id: string; baseName: string; at: LatLng }[] = [
  { id: "AMB-01", baseName: "Sfax Centre station", at: [34.743, 10.755] },
  { id: "AMB-02", baseName: "Sfax North station", at: [34.776, 10.74] },
  { id: "AMB-03", baseName: "Sfax South station", at: [34.711, 10.73] },
  { id: "AMB-04", baseName: "Sfax West station", at: [34.752, 10.701] },
]

function idleAmbulance(b: (typeof BASES)[number]): Ambulance {
  return {
    id: b.id,
    baseName: b.baseName,
    baseLat: b.at[0],
    baseLng: b.at[1],
    lat: b.at[0],
    lng: b.at[1],
    status: "available",
    assignedPatientId: null,
    destination: null,
    route: [],
    routeLengthKm: 0,
    progressKm: 0,
    eta: null,
    minutesOnScene: 0,
  }
}

function etaFor(a: Ambulance) {
  return Math.max(1, Math.ceil((a.routeLengthKm - a.progressKm) / AMBULANCE_KM_PER_MIN))
}

function startMission(a: Ambulance, destination: LatLng, progressKm = 0): Ambulance {
  const route = schematicRoute(pos(a), destination)
  const length = routeLength(route)
  const progress = Math.min(progressKm, length * 0.9)
  const [lat, lng] = pointAlongRoute(route, progress)
  const next = { ...a, route, routeLengthKm: length, progressKm: progress, destination, lat, lng, minutesOnScene: 0 }
  return { ...next, eta: etaFor(next) }
}

function zoneFromPatients(
  id: string,
  name: string,
  members: Patient[],
  startedAt: number,
  elapsed: number,
  duration: number,
): OutageZone {
  const centerLat = members.reduce((s, p) => s + p.lat, 0) / members.length
  const centerLng = members.reduce((s, p) => s + p.lng, 0) / members.length
  const farthest = Math.max(...members.map((p) => distanceKm([centerLat, centerLng], pos(p))))
  return {
    id,
    name,
    centerLat,
    centerLng,
    radiusKm: Math.max(1.2, Number((farthest + 0.5).toFixed(1))),
    startedAt,
    durationMinutes: duration,
    elapsedMinutes: elapsed,
    severity: members.length >= 4 ? "high" : "moderate",
    status: "active",
    affectedPatients: members.map((p) => p.id),
  }
}

function markNearOutage(patients: Patient[], outages: OutageZone[], iso: string): Patient[] {
  return patients.map((p) => {
    const near =
      p.powerStatus === "on" &&
      outages.some((o) => distanceKm([o.centerLat, o.centerLng], pos(p)) <= o.radiusKm + NEAR_OUTAGE_BUFFER_KM)
    return near === p.nearOutage ? p : recompute({ ...p, nearOutage: near }, iso)
  })
}

const ESCALATION: Record<Exclude<AlertLevel, "none">, { kind: AlertEventKind; text: string }> = {
  family: { kind: "family", text: "Family SMS sent" },
  caregiver: { kind: "caregiver", text: "Caregivers called" },
  SAMU: { kind: "samu", text: "SAMU Sfax alerted" },
}

export function createInitialState(nowMs: number): SimulationState {
  const iso = new Date(nowMs).toISOString()
  let patients = createInitialPatients(iso)
  const minute = 60_000

  const clusterA = patients.filter((p) => p.outageId === "OUT-001")
  const clusterB = patients.filter((p) => p.outageId === "OUT-002")
  const aMin = INITIAL_OUTAGE_MINUTES["OUT-001"]
  const bMin = INITIAL_OUTAGE_MINUTES["OUT-002"]
  const outages = [
    zoneFromPatients("OUT-001", "Sfax North — Sakiet Ezzit", clusterA, nowMs - aMin * minute, aMin, 40),
    zoneFromPatients("OUT-002", "Thyna", clusterB, nowMs - bMin * minute, bMin, 24),
  ]

  const ambulances = BASES.map(idleAmbulance)
  const firstTarget = patients.find((p) => p.id === "PT-001")!
  const amb2Index = ambulances.findIndex((a) => a.id === "AMB-02")
  const mission = startMission(
    { ...ambulances[amb2Index], status: "en_route", assignedPatientId: firstTarget.id },
    pos(firstTarget),
    2.2,
  )
  ambulances[amb2Index] = mission
  patients = patients.map((p) =>
    p.id === firstTarget.id
      ? recompute({ ...p, responderDispatched: true, responderId: mission.id, responderETA: mission.eta }, iso)
      : p,
  )
  patients = markNearOutage(patients, outages, iso)

  const seeded: NewEvent[] = []
  for (const [zone, members, mins] of [
    [outages[0], clusterA, aMin],
    [outages[1], clusterB, bMin],
  ] as const) {
    const start = nowMs - mins * minute
    seeded.push({ time: start, kind: "outage", message: `Local outage detected — ${zone.name} — ${members.length} oxygen patients affected` })
    seeded.push({ time: start + 30_000, kind: "family", message: `Family SMS sent — ${zone.id} — ${members.length} oxygen patients` })
    seeded.push({ time: start + 2 * minute, kind: "caregiver", message: `Caregivers called — ${zone.id} — ${members.length} oxygen patients` })
    seeded.push({ time: start + 4 * minute, kind: "samu", message: `SAMU Sfax alerted — ${zone.id} — ${members.length} oxygen patients` })
  }
  for (const p of patients.filter((p) => p.status === "danger")) {
    seeded.push({ time: nowMs - 2 * minute, kind: "critical", message: `Critical oxygen patient — ${p.name} — battery ${p.batteryPercent}%` })
  }
  seeded.push({ time: nowMs - 3 * minute, kind: "dispatch", message: `Ambulance AMB-02 dispatched — ${firstTarget.name} (${firstTarget.area})` })
  seeded.push({ time: nowMs - 2.5 * minute, kind: "enroute", message: `AMB-02 en route — ETA ${pad(mission.eta ?? 0)} min` })

  const events = seeded
    .sort((a, b) => b.time - a.time)
    .map((e, i, arr) => ({ ...e, id: arr.length - i }))

  return { patients, outages, ambulances, events, nextEventId: events.length + 1, nextOutageNumber: 3, lastTick: nowMs }
}

export function simulateTick(state: SimulationState, nowMs: number): SimulationState {
  const iso = new Date(nowMs).toISOString()
  const newEvents: NewEvent[] = []
  const push = (kind: AlertEventKind, message: string) => newEvents.push({ time: nowMs, kind, message })

  let patients = state.patients
  let outages = state.outages.map((o) => ({ ...o, elapsedMinutes: o.elapsedMinutes + 1 }))

  // 1. Zone-level restoration: the whole outage area comes back together.
  for (const zone of outages.filter((o) => o.elapsedMinutes >= o.durationMinutes)) {
    const restored = patients.filter((p) => p.outageId === zone.id)
    patients = patients.map((p) =>
      p.outageId === zone.id
        ? recompute({ ...p, powerStatus: "on", outageId: null, minutesWithoutPower: 0, oxygenBackup: "none" }, iso)
        : p,
    )
    push("outage_restored", `Power restored — ${zone.name} — ${restored.length} oxygen patients`)
  }
  outages = outages.filter((o) => o.elapsedMinutes < o.durationMinutes)

  // 2. Battery depletion + escalation for patients inside active outages.
  const escalations = new Map<string, { level: Exclude<AlertLevel, "none">; count: number }>()
  patients = patients.map((prev) => {
    if (prev.powerStatus !== "cut") {
      return prev.batteryPercent < 100 ? recompute({ ...prev, batteryPercent: prev.batteryPercent + randInt(1, 3) }, iso) : prev
    }
    const next = recompute(
      { ...prev, batteryPercent: prev.batteryPercent - randInt(1, 2), minutesWithoutPower: prev.minutesWithoutPower + 1 },
      iso,
    )
    if (next.alertLevel !== prev.alertLevel && next.alertLevel !== "none" && next.outageId) {
      const key = `${next.outageId}:${next.alertLevel}`
      const entry = escalations.get(key) ?? { level: next.alertLevel, count: 0 }
      escalations.set(key, { ...entry, count: entry.count + 1 })
    }
    if (prev.status !== "danger" && next.status === "danger") {
      push("critical", `Critical oxygen patient — ${next.name} — battery ${next.batteryPercent}%`)
    } else if (next.oxygenBackup === "none" && prev.batteryPercent > 15 && next.batteryPercent <= 15) {
      push("battery", `Oxygen battery low — ${next.name} — ${next.batteryPercent}%`)
    }
    if (prev.batteryPercent > 0 && next.batteryPercent === 0 && next.oxygenBackup === "none") {
      push("critical", `Oxygen supply emergency — ${next.name} — concentrator offline`)
    }
    return next
  })
  for (const [key, { level, count }] of escalations) {
    const zoneId = key.split(":")[0]
    push(ESCALATION[level].kind, `${ESCALATION[level].text} — ${zoneId} — ${count} oxygen patient${count > 1 ? "s" : ""}`)
  }

  // 3. Ambulance movement along simulated routes.
  const ambulances = state.ambulances.map((a) => {
    if (a.status === "en_route") {
      const justLeft = a.progressKm === 0
      const progressKm = Math.min(a.routeLengthKm, a.progressKm + AMBULANCE_KM_PER_MIN)
      const [lat, lng] = pointAlongRoute(a.route, progressKm)
      const moved = { ...a, progressKm, lat, lng }
      const target = patients.find((p) => p.id === a.assignedPatientId)
      if (progressKm >= a.routeLengthKm) {
        if (target) {
          patients = patients.map((p) =>
            p.id === target.id
              ? recompute({ ...p, responderETA: 0, oxygenBackup: p.powerStatus === "cut" ? "cylinder" : "none" }, iso)
              : p,
          )
          push("onscene", `${a.id} on scene — ${target.name} — portable O2 cylinder connected`)
        }
        return { ...moved, status: "on_scene" as const, eta: 0, minutesOnScene: 0 }
      }
      const eta = etaFor(moved)
      if (justLeft) push("enroute", `${a.id} en route — ETA ${pad(eta)} min`)
      patients = patients.map((p) => (p.id === a.assignedPatientId ? { ...p, responderETA: eta } : p))
      return { ...moved, eta }
    }
    if (a.status === "on_scene") {
      if (a.minutesOnScene + 1 < MINUTES_ON_SCENE) return { ...a, minutesOnScene: a.minutesOnScene + 1 }
      push("returning", `${a.id} returning to ${a.baseName}`)
      return startMission({ ...a, status: "returning" as const, assignedPatientId: null }, [a.baseLat, a.baseLng])
    }
    if (a.status === "returning") {
      const progressKm = Math.min(a.routeLengthKm, a.progressKm + AMBULANCE_KM_PER_MIN)
      if (progressKm >= a.routeLengthKm) return idleAmbulance(BASES.find((b) => b.id === a.id)!)
      const [lat, lng] = pointAlongRoute(a.route, progressKm)
      const moved = { ...a, progressKm, lat, lng }
      return { ...moved, eta: etaFor(moved) }
    }
    return a
  })

  // 4. Occasionally a new localized outage hits a cluster of nearby patients.
  let nextOutageNumber = state.nextOutageNumber
  if (outages.length < MAX_ACTIVE_OUTAGES && Math.random() < NEW_OUTAGE_CHANCE) {
    const zone = pickNewOutage(patients, nextOutageNumber, nowMs)
    if (zone) {
      nextOutageNumber++
      outages = [...outages, zone]
      patients = patients.map((p) =>
        zone.affectedPatients.includes(p.id)
          ? recompute(
              {
                ...p,
                powerStatus: "cut",
                outageId: zone.id,
                minutesWithoutPower: 0,
                oxygenBackup: "none",
                responderDispatched: false,
                responderId: null,
                responderETA: null,
              },
              iso,
            )
          : p,
      )
      push("outage", `Local outage detected — ${zone.name} — ${zone.affectedPatients.length} oxygen patients affected`)
    }
  }

  patients = markNearOutage(patients, outages, iso)

  let next: SimulationState = { ...state, patients, outages, ambulances, nextOutageNumber, lastTick: nowMs }
  next = appendEvents(next, newEvents)

  // 5. Auto-dispatch the most urgent unassigned patient when oxygen support is nearly exhausted.
  const urgent = next.patients
    .filter(
      (p) =>
        p.powerStatus === "cut" &&
        p.oxygenBackup === "none" &&
        !p.responderDispatched &&
        p.batteryMinutesRemaining <= AUTO_DISPATCH_SUPPORT_MINUTES,
    )
    .sort((a, b) => b.priorityScore - a.priorityScore)[0]
  if (urgent && next.ambulances.some((a) => a.status === "available")) {
    next = dispatchResponder(next, urgent.id, nowMs, true)
  }

  return next
}

function pickNewOutage(patients: Patient[], number: number, nowMs: number): OutageZone | null {
  const total = patients.length
  const cutCount = patients.filter((p) => p.powerStatus === "cut").length
  const powered = patients.filter((p) => p.powerStatus === "on")
  const radiusKm = 1.6 + Math.random() * 1.2

  let best: Patient[] = []
  for (const center of powered) {
    const members = powered.filter((p) => distanceKm(pos(center), pos(p)) <= radiusKm)
    if (members.length > best.length || (members.length === best.length && Math.random() < 0.5)) best = members
  }
  if (best.length < 2) return null
  const cap = Math.round(total * (TARGET_AFFECTED_RATIO + 0.1)) - cutCount
  if (cap < 2) return null
  best = best.slice(0, cap)

  const id = `OUT-${String(number).padStart(3, "0")}`
  return zoneFromPatients(id, best[0].area, best, nowMs, 0, randInt(18, 32))
}

export function dispatchResponder(state: SimulationState, patientId: string, nowMs: number, auto = false): SimulationState {
  const target = state.patients.find((p) => p.id === patientId)
  if (!target || target.responderDispatched) return state

  const nearest = state.ambulances
    .filter((a) => a.status === "available")
    .sort((a, b) => distanceKm(pos(a), pos(target)) - distanceKm(pos(b), pos(target)))[0]

  if (!nearest) {
    return appendEvents(state, [
      { time: nowMs, kind: "busy", message: `All ambulances busy — ${target.name} queued for next available unit` },
    ])
  }

  const mission = startMission({ ...nearest, status: "en_route", assignedPatientId: target.id }, pos(target))
  const iso = new Date(nowMs).toISOString()
  return appendEvents(
    {
      ...state,
      ambulances: state.ambulances.map((a) => (a.id === mission.id ? mission : a)),
      patients: state.patients.map((p) =>
        p.id === target.id
          ? recompute({ ...p, responderDispatched: true, responderId: mission.id, responderETA: mission.eta }, iso)
          : p,
      ),
    },
    [
      {
        time: nowMs,
        kind: "dispatch",
        message: `${auto ? "Auto-dispatch: " : ""}Ambulance ${mission.id} dispatched — ${target.name} (${target.area}) — ETA ${pad(mission.eta ?? 0)} min`,
      },
    ],
  )
}

function appendEvents(state: SimulationState, events: NewEvent[]): SimulationState {
  if (events.length === 0) return state
  let nextId = state.nextEventId
  const withIds = events.map((e) => ({ ...e, id: nextId++ })).reverse()
  return {
    ...state,
    events: [...withIds, ...state.events].slice(0, MAX_EVENTS),
    nextEventId: nextId,
  }
}
