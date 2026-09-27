export type MachineType = "Oxygen Concentrator"

export type PatientStatus = "stable" | "warning" | "danger"
export type PowerStatus = "on" | "cut"
export type AlertLevel = "family" | "caregiver" | "SAMU" | "none"
export type OxygenBackup = "none" | "cylinder"

export type LatLng = [number, number]

export interface Patient {
  id: string
  name: string
  age: number
  area: string
  lat: number
  lng: number

  machine: MachineType
  machineCriticality: 3

  status: PatientStatus
  powerStatus: PowerStatus
  outageId: string | null
  nearOutage: boolean
  oxygenBackup: OxygenBackup

  batteryPercent: number
  batteryMinutesRemaining: number
  minutesWithoutPower: number

  alertSent: boolean
  alertLevel: AlertLevel

  priorityScore: number

  responderDispatched: boolean
  responderId: string | null
  responderETA: number | null

  phone: string
  emergencyContact: string
  emergencyPhone: string

  lastUpdated: string
}

export type OutageSeverity = "moderate" | "high"
export type OutageStatus = "active" | "restored"

export interface OutageZone {
  id: string
  name: string
  centerLat: number
  centerLng: number
  radiusKm: number
  startedAt: number
  /** Simulated minutes until the grid operator restores this zone. */
  durationMinutes: number
  elapsedMinutes: number
  severity: OutageSeverity
  status: OutageStatus
  affectedPatients: string[]
}

export type AmbulanceStatus = "available" | "en_route" | "on_scene" | "returning"

export interface Ambulance {
  id: string
  baseName: string
  baseLat: number
  baseLng: number
  lat: number
  lng: number
  status: AmbulanceStatus
  assignedPatientId: string | null
  destination: LatLng | null
  route: LatLng[]
  routeLengthKm: number
  progressKm: number
  eta: number | null
  minutesOnScene: number
}

export type AlertEventKind =
  | "outage"
  | "outage_restored"
  | "samu"
  | "caregiver"
  | "family"
  | "critical"
  | "battery"
  | "dispatch"
  | "enroute"
  | "onscene"
  | "returning"
  | "busy"

export interface AlertEvent {
  id: number
  time: number
  kind: AlertEventKind
  message: string
}

export interface SimulationState {
  patients: Patient[]
  outages: OutageZone[]
  ambulances: Ambulance[]
  events: AlertEvent[]
  nextEventId: number
  nextOutageNumber: number
  lastTick: number
}
