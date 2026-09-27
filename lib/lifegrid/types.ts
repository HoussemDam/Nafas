export type MachineType =
  | "Oxygen Concentrator"
  | "Home Ventilator"
  | "Dialysis Machine"
  | "Infusion Pump"
  | "CPAP Machine"
  | "Nebulizer"

export type PatientStatus = "stable" | "warning" | "danger"
export type PowerStatus = "on" | "cut"
export type AlertLevel = "family" | "caregiver" | "SAMU" | "none"

export interface Patient {
  id: string
  name: string
  age: number
  city: string
  lat: number
  lng: number
  machine: MachineType
  machineCriticality: 1 | 2 | 3
  status: PatientStatus
  powerStatus: PowerStatus
  batteryPercent: number
  batteryMinutesRemaining: number
  minutesWithoutPower: number
  alertSent: boolean
  alertLevel: AlertLevel
  priorityScore: number
  responderDispatched: boolean
  responderETA: number | null
  phone: string
  emergencyContact: string
  emergencyPhone: string
  lastUpdated: string
}

export type AlertEventKind =
  | "samu"
  | "caregiver"
  | "family"
  | "restored"
  | "cut"
  | "critical"
  | "dispatch"
  | "arrived"

export interface AlertEvent {
  id: number
  time: number
  kind: AlertEventKind
  message: string
}

export interface SimulationState {
  patients: Patient[]
  events: AlertEvent[]
  nextEventId: number
  lastTick: number
}
