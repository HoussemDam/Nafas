import type { AlertLevel, Patient, PatientStatus } from "./types"

/** Simulated UPS/battery runtime of a home oxygen concentrator at 100% charge. */
const BACKUP_MINUTES_AT_FULL_CHARGE = 60

export const CRITICAL_BATTERY_PERCENT = 30

export function calcBatteryMinutes(batteryPercent: number): number {
  return Math.round((batteryPercent / 100) * BACKUP_MINUTES_AT_FULL_CHARGE)
}

/**
 * Oxygen outage priority (0–100). All patients share the same device and
 * criticality, so ranking depends on remaining oxygen support:
 *   in outage:  30 + 0.4 × (100 − battery) + 0.8 × min(minutes without power, 30)
 *               + 15 if < 10 min support (+8 if < 20 min)
 *               − 10 if a responder is already assigned
 *   cylinder delivered on scene: capped at 30
 *   grid power on: 0.2 × (100 − battery) + 12 if near an active outage zone
 */
export function calcPriorityScore(p: Patient, supportMinutes: number): number {
  if (p.powerStatus === "on") {
    return Math.min(40, Math.round((100 - p.batteryPercent) * 0.2 + (p.nearOutage ? 12 : 0)))
  }
  if (p.oxygenBackup === "cylinder") return Math.min(30, Math.round(20 + (100 - p.batteryPercent) * 0.1))

  const lowSupport = supportMinutes < 10 ? 15 : supportMinutes < 20 ? 8 : 0
  const raw =
    30 +
    (100 - p.batteryPercent) * 0.4 +
    Math.min(p.minutesWithoutPower, 30) * 0.8 +
    lowSupport -
    (p.responderDispatched ? 10 : 0)
  return Math.max(0, Math.min(100, Math.round(raw)))
}

export function calcStatus(p: Patient): PatientStatus {
  if (p.powerStatus === "cut") {
    if (p.oxygenBackup === "cylinder") return "warning"
    return p.batteryPercent < CRITICAL_BATTERY_PERCENT ? "danger" : "warning"
  }
  return p.nearOutage || p.batteryPercent < CRITICAL_BATTERY_PERCENT ? "warning" : "stable"
}

export function calcAlertLevel(p: Patient): AlertLevel {
  if (p.powerStatus === "on") return "none"
  if (p.minutesWithoutPower <= 1) return "family"
  if (p.minutesWithoutPower <= 3) return "caregiver"
  return "SAMU"
}

export function recompute(patient: Patient, now: string): Patient {
  const batteryPercent = Math.max(0, Math.min(100, Math.round(patient.batteryPercent)))
  const base = { ...patient, batteryPercent }
  const batteryMinutesRemaining = calcBatteryMinutes(batteryPercent)
  const alertLevel = calcAlertLevel(base)
  return {
    ...base,
    batteryMinutesRemaining,
    priorityScore: calcPriorityScore(base, batteryMinutesRemaining),
    status: calcStatus(base),
    alertLevel,
    alertSent: alertLevel !== "none",
    lastUpdated: now,
  }
}

export function formatClock(ms: number, withSeconds = false): string {
  const d = new Date(ms)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  if (!withSeconds) return `${hh}:${mm}`
  const ss = String(d.getSeconds()).padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}
