import { MACHINE_CRITICALITY, recompute } from "./calculations"
import type { MachineType, Patient, PowerStatus } from "./types"

const CITIES: Record<string, [number, number]> = {
  Tunis: [36.8065, 10.1815],
  Sfax: [34.7398, 10.76],
  Sousse: [35.8256, 10.6369],
  Kasserine: [35.1676, 8.8365],
  Gafsa: [34.4311, 8.7757],
  "Gabès": [33.8881, 10.0975],
  Bizerte: [37.2746, 9.8739],
  Nabeul: [36.4561, 10.7376],
  Kairouan: [35.6781, 10.0964],
  "Médenine": [33.3549, 10.5055],
}

type Seed = {
  name: string
  age: number
  city: keyof typeof CITIES
  offset: [number, number]
  machine: MachineType
  power: PowerStatus
  battery: number
  minutesCut: number
  phone: string
  contact: string
  contactPhone: string
}

const SEEDS: Seed[] = [
  { name: "Mohamed Ben Ali", age: 71, city: "Sfax", offset: [0, 0], machine: "Home Ventilator", power: "cut", battery: 23, minutesCut: 16, phone: "+216 74 221 908", contact: "Fatma Ben Ali", contactPhone: "+216 98 412 337" },
  { name: "Amina Trabelsi", age: 64, city: "Kasserine", offset: [0, 0], machine: "Oxygen Concentrator", power: "cut", battery: 19, minutesCut: 22, phone: "+216 77 473 115", contact: "Sami Trabelsi", contactPhone: "+216 22 519 640" },
  { name: "Khaled Gharbi", age: 78, city: "Gafsa", offset: [0, 0], machine: "Dialysis Machine", power: "cut", battery: 27, minutesCut: 11, phone: "+216 76 224 381", contact: "Najwa Gharbi", contactPhone: "+216 50 873 216" },
  { name: "Hedi Jlassi", age: 82, city: "Kairouan", offset: [0, 0], machine: "Oxygen Concentrator", power: "cut", battery: 14, minutesCut: 29, phone: "+216 77 230 764", contact: "Rim Jlassi", contactPhone: "+216 97 305 482" },
  { name: "Zohra Hammami", age: 69, city: "Médenine", offset: [0, 0], machine: "Home Ventilator", power: "cut", battery: 25, minutesCut: 18, phone: "+216 75 640 219", contact: "Anis Hammami", contactPhone: "+216 29 118 453" },
  { name: "Riadh Bouazizi", age: 57, city: "Tunis", offset: [0.018, -0.022], machine: "CPAP Machine", power: "cut", battery: 54, minutesCut: 2, phone: "+216 71 845 302", contact: "Leila Bouazizi", contactPhone: "+216 55 740 918" },
  { name: "Sonia Mejri", age: 61, city: "Sousse", offset: [0, 0], machine: "Infusion Pump", power: "cut", battery: 41, minutesCut: 7, phone: "+216 73 219 566", contact: "Walid Mejri", contactPhone: "+216 24 681 307" },
  { name: "Hassen Dridi", age: 74, city: "Gabès", offset: [0, 0], machine: "Oxygen Concentrator", power: "cut", battery: 63, minutesCut: 1, phone: "+216 75 271 843", contact: "Houda Dridi", contactPhone: "+216 92 457 130" },
  { name: "Mounira Chaabane", age: 66, city: "Kasserine", offset: [0.045, 0.06], machine: "Nebulizer", power: "cut", battery: 72, minutesCut: 4, phone: "+216 77 481 026", contact: "Karim Chaabane", contactPhone: "+216 58 302 774" },
  { name: "Leila Mansouri", age: 59, city: "Tunis", offset: [-0.014, 0.02], machine: "Infusion Pump", power: "on", battery: 96, minutesCut: 0, phone: "+216 71 390 427", contact: "Youssef Mansouri", contactPhone: "+216 20 634 591" },
  { name: "Ahmed Karoui", age: 80, city: "Tunis", offset: [0.03, 0.035], machine: "Dialysis Machine", power: "on", battery: 100, minutesCut: 0, phone: "+216 71 562 918", contact: "Salma Karoui", contactPhone: "+216 98 223 760" },
  { name: "Najwa Sassi", age: 52, city: "Sfax", offset: [0.035, -0.04], machine: "CPAP Machine", power: "on", battery: 88, minutesCut: 0, phone: "+216 74 603 185", contact: "Nizar Sassi", contactPhone: "+216 26 947 312" },
  { name: "Mongi Ayari", age: 76, city: "Sousse", offset: [0.03, -0.035], machine: "Home Ventilator", power: "on", battery: 100, minutesCut: 0, phone: "+216 73 845 630", contact: "Ines Ayari", contactPhone: "+216 53 108 469" },
  { name: "Fatma Khelifi", age: 68, city: "Bizerte", offset: [0, 0], machine: "Oxygen Concentrator", power: "on", battery: 92, minutesCut: 0, phone: "+216 72 431 709", contact: "Bilel Khelifi", contactPhone: "+216 94 385 021" },
  { name: "Tarek Zouari", age: 47, city: "Bizerte", offset: [-0.03, 0.04], machine: "Nebulizer", power: "on", battery: 100, minutesCut: 0, phone: "+216 72 590 318", contact: "Asma Zouari", contactPhone: "+216 21 760 544" },
  { name: "Samira Belhadj", age: 73, city: "Nabeul", offset: [0, 0], machine: "Dialysis Machine", power: "on", battery: 85, minutesCut: 0, phone: "+216 72 287 954", contact: "Hatem Belhadj", contactPhone: "+216 99 512 876" },
  { name: "Abdelkader Ferchichi", age: 84, city: "Gafsa", offset: [0.04, 0.05], machine: "Infusion Pump", power: "on", battery: 79, minutesCut: 0, phone: "+216 76 318 402", contact: "Mariem Ferchichi", contactPhone: "+216 51 294 687" },
  { name: "Habib Ghannouchi", age: 63, city: "Médenine", offset: [0.04, -0.05], machine: "CPAP Machine", power: "on", battery: 94, minutesCut: 0, phone: "+216 75 702 663", contact: "Nadia Ghannouchi", contactPhone: "+216 23 856 190" },
]

export function createInitialPatients(now: string): Patient[] {
  return SEEDS.map((s, i) => {
    const [lat, lng] = CITIES[s.city]
    const base: Patient = {
      id: `PT-${String(i + 1).padStart(3, "0")}`,
      name: s.name,
      age: s.age,
      city: s.city,
      lat: +(lat + s.offset[0]).toFixed(4),
      lng: +(lng + s.offset[1]).toFixed(4),
      machine: s.machine,
      machineCriticality: MACHINE_CRITICALITY[s.machine],
      status: "stable",
      powerStatus: s.power,
      batteryPercent: s.battery,
      batteryMinutesRemaining: 0,
      minutesWithoutPower: s.minutesCut,
      alertSent: false,
      alertLevel: "none",
      priorityScore: 0,
      responderDispatched: false,
      responderETA: null,
      phone: s.phone,
      emergencyContact: s.contact,
      emergencyPhone: s.contactPhone,
      lastUpdated: now,
    }
    return recompute(base, now)
  })
}
