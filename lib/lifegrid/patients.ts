import { recompute } from "./calculations"
import type { LatLng, Patient } from "./types"

/**
 * Approximate neighbourhood-level coordinates in Greater Sfax.
 * No street addresses are used; every patient location is simulated.
 */
export const AREAS: Record<string, LatLng> = {
  "Sakiet Ezzit": [34.7985, 10.7575],
  "Sakiet Eddaier": [34.7905, 10.7775],
  "Route de Tunis": [34.7815, 10.7545],
  Thyna: [34.6845, 10.7065],
  "Route de Gabès": [34.7005, 10.7215],
  "Sfax Médina": [34.7345, 10.7625],
  "Sfax Jadida": [34.7425, 10.7535],
  Chihia: [34.7755, 10.7155],
  "El Aïn": [34.7555, 10.7185],
  Gremda: [34.7715, 10.6955],
  "Sidi Mansour": [34.7925, 10.8235],
  "Route de l'Aéroport": [34.7255, 10.7085],
  "El Hajeb": [34.7505, 10.6835],
}

type Seed = {
  name: string
  age: number
  area: keyof typeof AREAS
  offset: LatLng
  outage: "OUT-001" | "OUT-002" | null
  battery: number
  phone: string
  contact: string
  contactPhone: string
}

/** Cluster A (OUT-001, Sfax North) cut 14 simulated minutes ago; Cluster B (OUT-002, Thyna) 6 minutes ago. */
export const INITIAL_OUTAGE_MINUTES = { "OUT-001": 14, "OUT-002": 6 } as const

const SEEDS: Seed[] = [
  // Cluster A — Sfax North (Sakiet Ezzit / Sakiet Eddaier / Route de Tunis): 6 affected
  { name: "Mohamed Ben Ali", age: 71, area: "Sakiet Ezzit", offset: [0.002, -0.003], outage: "OUT-001", battery: 22, phone: "+216 74 412 118", contact: "Fatma Ben Ali", contactPhone: "+216 98 214 553" },
  { name: "Ahmed Trabelsi", age: 78, area: "Sakiet Ezzit", offset: [-0.004, 0.005], outage: "OUT-001", battery: 28, phone: "+216 74 419 302", contact: "Sami Trabelsi", contactPhone: "+216 22 871 409" },
  { name: "Habiba Jlassi", age: 66, area: "Sakiet Eddaier", offset: [0.003, -0.002], outage: "OUT-001", battery: 44, phone: "+216 74 455 027", contact: "Rania Jlassi", contactPhone: "+216 55 302 816" },
  { name: "Mongi Chaabouni", age: 82, area: "Sakiet Eddaier", offset: [-0.003, 0.003], outage: "OUT-001", battery: 57, phone: "+216 74 457 640", contact: "Leila Chaabouni", contactPhone: "+216 97 663 120" },
  { name: "Nejiba Frikha", age: 74, area: "Route de Tunis", offset: [0.004, 0.004], outage: "OUT-001", battery: 36, phone: "+216 74 231 885", contact: "Karim Frikha", contactPhone: "+216 29 148 732" },
  { name: "Slaheddine Kammoun", age: 69, area: "Sakiet Ezzit", offset: [-0.006, -0.004], outage: "OUT-001", battery: 63, phone: "+216 74 418 950", contact: "Olfa Kammoun", contactPhone: "+216 50 776 214" },

  // Cluster B — Thyna / Route de Gabès: 2 affected
  { name: "Zeineb Masmoudi", age: 80, area: "Thyna", offset: [0.002, 0.001], outage: "OUT-002", battery: 27, phone: "+216 74 681 204", contact: "Hatem Masmoudi", contactPhone: "+216 92 540 377" },
  { name: "Bechir Ellouze", age: 73, area: "Route de Gabès", offset: [-0.004, -0.003], outage: "OUT-002", battery: 71, phone: "+216 74 690 511", contact: "Ines Ellouze", contactPhone: "+216 24 889 061" },

  // Unaffected — spread across the monitored region: 10 patients
  { name: "Sonia Mejri", age: 64, area: "Sfax Médina", offset: [0.001, -0.002], outage: null, battery: 100, phone: "+216 74 220 413", contact: "Walid Mejri", contactPhone: "+216 58 312 940" },
  { name: "Abdelkader Hammami", age: 85, area: "Sfax Médina", offset: [-0.002, 0.003], outage: null, battery: 96, phone: "+216 74 226 780", contact: "Amel Hammami", contactPhone: "+216 21 604 518" },
  { name: "Latifa Charfi", age: 70, area: "Sfax Jadida", offset: [0.002, 0.002], outage: null, battery: 100, phone: "+216 74 297 052", contact: "Nizar Charfi", contactPhone: "+216 93 417 286" },
  { name: "Hedi Bouaziz", age: 77, area: "Chihia", offset: [0.001, -0.003], outage: null, battery: 92, phone: "+216 74 473 619", contact: "Samia Bouaziz", contactPhone: "+216 26 750 193" },
  { name: "Rafika Ayadi", age: 68, area: "El Aïn", offset: [0.003, 0.001], outage: null, battery: 100, phone: "+216 74 462 305", contact: "Youssef Ayadi", contactPhone: "+216 54 238 671" },
  { name: "Taoufik Sellami", age: 79, area: "El Aïn", offset: [-0.004, -0.002], outage: null, battery: 88, phone: "+216 74 464 881", contact: "Mouna Sellami", contactPhone: "+216 99 105 342" },
  { name: "Mabrouka Gargouri", age: 83, area: "Gremda", offset: [0.002, 0.002], outage: null, battery: 100, phone: "+216 74 486 017", contact: "Anis Gargouri", contactPhone: "+216 20 963 458" },
  { name: "Fethi Ben Salah", age: 72, area: "Sidi Mansour", offset: [-0.002, -0.003], outage: null, battery: 97, phone: "+216 74 501 236", contact: "Houda Ben Salah", contactPhone: "+216 53 681 029" },
  { name: "Najet Zouari", age: 67, area: "Route de l'Aéroport", offset: [0.002, -0.002], outage: null, battery: 100, phone: "+216 74 278 904", contact: "Bilel Zouari", contactPhone: "+216 95 327 716" },
  { name: "Ridha Karray", age: 76, area: "El Hajeb", offset: [-0.002, 0.003], outage: null, battery: 94, phone: "+216 74 493 562", contact: "Sana Karray", contactPhone: "+216 27 458 830" },
]

export function createInitialPatients(now: string): Patient[] {
  return SEEDS.map((s, i) => {
    const [lat, lng] = AREAS[s.area]
    const minutesCut = s.outage ? INITIAL_OUTAGE_MINUTES[s.outage] : 0
    return recompute(
      {
        id: `PT-${String(i + 1).padStart(3, "0")}`,
        name: s.name,
        age: s.age,
        area: s.area,
        lat: Number((lat + s.offset[0]).toFixed(4)),
        lng: Number((lng + s.offset[1]).toFixed(4)),
        machine: "Oxygen Concentrator",
        machineCriticality: 3,
        status: "stable",
        powerStatus: s.outage ? "cut" : "on",
        outageId: s.outage,
        nearOutage: false,
        oxygenBackup: "none",
        batteryPercent: s.battery,
        batteryMinutesRemaining: 0,
        minutesWithoutPower: minutesCut,
        alertSent: false,
        alertLevel: "none",
        priorityScore: 0,
        responderDispatched: false,
        responderId: null,
        responderETA: null,
        phone: s.phone,
        emergencyContact: s.contact,
        emergencyPhone: s.contactPhone,
        lastUpdated: now,
      },
      now,
    )
  })
}
