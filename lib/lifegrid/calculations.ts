import type { AlertLevel, MachineType, Patient, PatientStatus, PowerStatus } from "./types"

export const MACHINE_CRITICALITY: Record<MachineType, 1 | 2 | 3> = {
  "Oxygen Concentrator": 3,
  "Home Ventilator": 3,
  "Dialysis Machine": 3,
  "Infusion Pump": 2,
  "CPAP Machine": 2,
  Nebulizer: 1,
}

export const CITY_REGION: Record<string, "Urban" | "Rural"> = {
  Tunis: "Urban",
  Sfax: "Urban",
  Sousse: "Urban",
  Bizerte: "Urban",
  Nabeul: "Urban",
  "Gabès": "Urban",
  Kasserine: "Rural",
  Gafsa: "Rural",
  "Médenine": "Rural",
  Kairouan: "Rural",
}

const BACKUP_MINUTES_AT_FULL_CHARGE = 60

export function calcBatteryMinutes(batteryPercent: number): number {
  return Math.round((batteryPercent / 100) * BACKUP_MINUTES_AT_FULL_CHARGE)
}

/**
 * Outage priority = (criticality × 25) + (minutes cut × 1.5) + (100 − battery) × 0.5, capped at 100.
 * Homes with grid power only carry a residual baseline so they never outrank an active outage.
 */
export function calcPriorityScore(
  criticality: number,
  minutesWithoutPower: number,
  batteryPercent: number,
  powerStatus: PowerStatus,
): number {
  if (powerStatus === "on") {
    return Math.min(100, Math.round(criticality * 8 + (100 - batteryPercent) * 0.3))
  }
  const raw = criticality * 25 + minutesWithoutPower * 1.5 + (100 - batteryPercent) * 0.5
  return Math.min(100, Math.round(raw))
}

export function calcStatus(powerStatus: PowerStatus, batteryPercent: number): PatientStatus {
  if (powerStatus === "cut") return batteryPercent < 30 ? "danger" : "warning"
  return batteryPercent < 30 ? "warning" : "stable"
}

export function calcAlertLevel(powerStatus: PowerStatus, minutesWithoutPower: number): AlertLevel {
  if (powerStatus === "on") return "none"
  if (minutesWithoutPower <= 1) return "family"
  if (minutesWithoutPower <= 3) return "caregiver"
  return "SAMU"
}

export function recompute(patient: Patient, now: string): Patient {
  const batteryPercent = Math.max(0, Math.min(100, Math.round(patient.batteryPercent)))
  const alertLevel = calcAlertLevel(patient.powerStatus, patient.minutesWithoutPower)
  return {
    ...patient,
    batteryPercent,
    batteryMinutesRemaining: calcBatteryMinutes(batteryPercent),
    priorityScore: calcPriorityScore(
      patient.machineCriticality,
      patient.minutesWithoutPower,
      batteryPercent,
      patient.powerStatus,
    ),
    status: calcStatus(patient.powerStatus, batteryPercent),
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
