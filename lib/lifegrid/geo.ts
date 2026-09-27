import type { LatLng } from "./types"

/** Approximate centre of Sfax city (Bab Bhar / Médina area). */
export const SFAX_CENTER: LatLng = [34.7385, 10.7605]

const KM_PER_DEG_LAT = 110.57
const KM_PER_DEG_LNG = 111.32 * Math.cos((SFAX_CENTER[0] * Math.PI) / 180)

/**
 * The Gulf of Gabès lies south-east of Sfax. Arcs around the city are
 * never allowed to sweep through this bearing so routes stay on land.
 */
const SEA_BEARING = (-45 * Math.PI) / 180

export function distanceKm(a: LatLng, b: LatLng): number {
  const dx = (b[1] - a[1]) * KM_PER_DEG_LNG
  const dy = (b[0] - a[0]) * KM_PER_DEG_LAT
  return Math.hypot(dx, dy)
}

function toPolar([lat, lng]: LatLng) {
  const x = (lng - SFAX_CENTER[1]) * KM_PER_DEG_LNG
  const y = (lat - SFAX_CENTER[0]) * KM_PER_DEG_LAT
  return { r: Math.hypot(x, y), theta: Math.atan2(y, x) }
}

function fromPolar(r: number, theta: number): LatLng {
  const x = r * Math.cos(theta)
  const y = r * Math.sin(theta)
  return [SFAX_CENTER[0] + y / KM_PER_DEG_LAT, SFAX_CENTER[1] + x / KM_PER_DEG_LNG]
}

function landAngle(theta: number) {
  const twoPi = Math.PI * 2
  return (((theta - SEA_BEARING) % twoPi) + twoPi) % twoPi
}

/**
 * Schematic road trajectory. Greater Sfax is organised as radial routes
 * (Route de Tunis, Gremda, El Aïn, Aéroport, Gabès…) joined by concentric
 * ring roads, so the path runs inward along a radial, around a ring, then
 * outward along the destination's radial. This is a simulated visualisation,
 * not turn-by-turn navigation.
 */
export function schematicRoute(from: LatLng, to: LatLng): LatLng[] {
  const a = toPolar(from)
  const b = toPolar(to)
  const ringR = Math.max(0.9, Math.min(a.r, b.r) * 0.85)

  const points: LatLng[] = [from]
  const radialSteps = (r1: number, r2: number, theta: number) => {
    const steps = Math.max(1, Math.ceil(Math.abs(r2 - r1) / 0.6))
    for (let i = 1; i <= steps; i++) points.push(fromPolar(r1 + ((r2 - r1) * i) / steps, theta))
  }

  radialSteps(a.r, ringR, a.theta)

  const la = landAngle(a.theta)
  const lb = landAngle(b.theta)
  const sweep = lb - la
  const arcSteps = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 24)))
  for (let i = 1; i <= arcSteps; i++) {
    points.push(fromPolar(ringR, SEA_BEARING + la + (sweep * i) / arcSteps))
  }

  radialSteps(ringR, b.r, b.theta)
  points.push(to)

  return points.filter((p, i) => i === 0 || distanceKm(p, points[i - 1]) > 0.02)
}

export function routeLength(route: LatLng[]): number {
  let total = 0
  for (let i = 1; i < route.length; i++) total += distanceKm(route[i - 1], route[i])
  return total
}

export function pointAlongRoute(route: LatLng[], km: number): LatLng {
  if (route.length === 0) return SFAX_CENTER
  let remaining = km
  for (let i = 1; i < route.length; i++) {
    const seg = distanceKm(route[i - 1], route[i])
    if (remaining <= seg) {
      const t = seg === 0 ? 0 : remaining / seg
      return [
        route[i - 1][0] + (route[i][0] - route[i - 1][0]) * t,
        route[i - 1][1] + (route[i][1] - route[i - 1][1]) * t,
      ]
    }
    remaining -= seg
  }
  return route[route.length - 1]
}

/** Returns [travelled, remaining] polylines split at `km`. */
export function splitRoute(route: LatLng[], km: number): [LatLng[], LatLng[]] {
  const travelled: LatLng[] = [route[0]]
  let acc = 0
  for (let i = 1; i < route.length; i++) {
    const seg = distanceKm(route[i - 1], route[i])
    if (acc + seg >= km) {
      const cut = pointAlongRoute(route, km)
      travelled.push(cut)
      return [travelled, [cut, ...route.slice(i)]]
    }
    acc += seg
    travelled.push(route[i])
  }
  return [travelled, [route[route.length - 1]]]
}
