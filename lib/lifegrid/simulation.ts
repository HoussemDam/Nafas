import { CITY_REGION, recompute } from "./calculations"
import { createInitialPatients } from "./patients"
import type { AlertEvent, AlertEventKind, Patient, SimulationState } from "./types"

export const TICK_MS = 10_000
const MAX_EVENTS = 40
const RESTORE_CHANCE = 0.05
const NEW_CUT_CHANCE = 0.03

const MACHINE_SHORT: Record<string, string> = {
  "Oxygen Concentrator": "O2",
  "Home Ventilator": "Ventilator",
  "Dialysis Machine": "Dialysis",
  "Infusion Pump": "Infusion",
  "CPAP Machine": "CPAP",
  Nebulizer: "Nebulizer",
}

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

function who(p: Patient) {
  return `${p.name} (${p.city})`
}

function escalationEvent(p: Patient): { kind: AlertEventKind; message: string } | null {
  const machine = MACHINE_SHORT[p.machine]
  switch (p.alertLevel) {
    case "SAMU":
      return { kind: "samu", message: `SAMU alerted — ${who(p)} — ${machine} — ${p.batteryMinutesRemaining} min battery` }
    case "caregiver":
      return { kind: "caregiver", message: `Caregiver notified — ${who(p)} — ${machine} — ${p.batteryPercent}%` }
    case "family":
      return { kind: "family", message: `Family SMS sent — ${who(p)} — ${machine} — power cut detected` }
    default:
      return null
  }
}

export function createInitialState(nowMs: number): SimulationState {
  const iso = new Date(nowMs).toISOString()
  const patients = createInitialPatients(iso)

  const seeded: Omit<AlertEvent, "id">[] = []
  for (const p of patients) {
    if (p.powerStatus !== "cut") continue
    seeded.push({
      time: nowMs - p.minutesWithoutPower * 60_000,
      kind: "cut",
      message: `Power cut detected — ${who(p)} — ${MACHINE_SHORT[p.machine]}`,
    })
    const esc = escalationEvent(p)
    if (esc) {
      const lag = p.alertLevel === "SAMU" ? 3 : p.alertLevel === "caregiver" ? 1 : 0
      seeded.push({ time: nowMs - Math.max(0, p.minutesWithoutPower - lag) * 60_000, ...esc })
    }
  }
  const restored = patients.find((p) => p.id === "PT-010")
  if (restored) {
    seeded.push({
      time: nowMs - 6 * 60_000,
      kind: "restored",
      message: `Power restored — ${who(restored)} — ${restored.machine}`,
    })
  }

  const events = seeded
    .sort((a, b) => b.time - a.time)
    .slice(0, 12)
    .map((e, i, arr) => ({ ...e, id: arr.length - i }))

  return { patients, events, nextEventId: events.length + 1, lastTick: nowMs }
}

export function simulateTick(state: SimulationState, nowMs: number): SimulationState {
  const iso = new Date(nowMs).toISOString()
  const newEvents: Omit<AlertEvent, "id">[] = []
  const push = (kind: AlertEventKind, message: string) => newEvents.push({ time: nowMs, kind, message })

  let patients = state.patients.map((p) => {
    const prev = p
    let next: Patient

    if (p.powerStatus === "cut") {
      next = recompute(
        {
          ...p,
          batteryPercent: p.batteryPercent - randInt(1, 3),
          minutesWithoutPower: p.minutesWithoutPower + 1,
        },
        iso,
      )
      if (next.alertLevel !== prev.alertLevel) {
        const esc = escalationEvent(next)
        if (esc) push(esc.kind, esc.message)
      }
      if (prev.status !== "danger" && next.status === "danger") {
        push("critical", `Battery critical — ${who(next)} — ${next.batteryPercent}% · ${next.batteryMinutesRemaining} min left`)
      }
      if (prev.batteryPercent > 0 && next.batteryPercent === 0) {
        push("critical", `Backup depleted — ${who(next)} — ${next.machine} offline`)
      }
    } else {
      next = recompute({ ...p, batteryPercent: p.batteryPercent + randInt(1, 3) }, iso)
    }

    if (next.responderDispatched && next.responderETA !== null) {
      const eta = Math.max(0, next.responderETA - 1)
      if (eta === 0 && next.responderETA > 0) {
        push("arrived", `Responder on site — ${who(next)}`)
      }
      next = { ...next, responderETA: eta }
    }
    return next
  })

  if (Math.random() < RESTORE_CHANCE) {
    const cut = patients.filter((p) => p.powerStatus === "cut")
    if (cut.length > 0) {
      const target = cut[randInt(0, cut.length - 1)]
      patients = patients.map((p) =>
        p.id === target.id ? recompute({ ...p, powerStatus: "on", minutesWithoutPower: 0 }, iso) : p,
      )
      push("restored", `Power restored — ${who(target)} — ${target.machine}`)
    }
  }

  if (Math.random() < NEW_CUT_CHANCE) {
    const stable = patients.filter((p) => p.status === "stable")
    if (stable.length > 0) {
      const target = stable[randInt(0, stable.length - 1)]
      patients = patients.map((p) =>
        p.id === target.id
          ? recompute({ ...p, powerStatus: "cut", minutesWithoutPower: 0, responderDispatched: false, responderETA: null }, iso)
          : p,
      )
      push("cut", `Power cut detected — ${who(target)} — ${MACHINE_SHORT[target.machine]}`)
      push("family", `Family SMS sent — ${who(target)} — ${MACHINE_SHORT[target.machine]} — power cut detected`)
    }
  }

  return appendEvents({ ...state, patients, lastTick: nowMs }, newEvents)
}

export function dispatchResponder(state: SimulationState, id: string, nowMs: number): SimulationState {
  const target = state.patients.find((p) => p.id === id)
  if (!target || target.responderDispatched) return state
  const rural = CITY_REGION[target.city] === "Rural"
  const eta = rural ? randInt(22, 40) : randInt(8, 18)
  const patients = state.patients.map((p) =>
    p.id === id ? { ...p, responderDispatched: true, responderETA: eta } : p,
  )
  return appendEvents({ ...state, patients }, [
    { time: nowMs, kind: "dispatch", message: `Responder dispatched — ${who(target)} — ETA ${eta} min` },
  ])
}

function appendEvents(state: SimulationState, events: Omit<AlertEvent, "id">[]): SimulationState {
  if (events.length === 0) return state
  let nextId = state.nextEventId
  const withIds = events.map((e) => ({ ...e, id: nextId++ })).reverse()
  return {
    ...state,
    events: [...withIds, ...state.events].slice(0, MAX_EVENTS),
    nextEventId: nextId,
  }
}
