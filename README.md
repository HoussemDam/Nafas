# NAFAS

Real-time monitoring and emergency alert dashboard for home patients who depend on life-critical medical devices (oxygen concentrators) during power outages in Tunisia. Built as a simulation demo focused on Greater Sfax, Nafas visualizes patient risk, power-grid outages, and ambulance dispatch on a live map.

> **Note:** This is a competition/demo project. All patient data, phone numbers, outages, and ambulance positions are simulated — locations are approximate neighbourhood-level points, not real addresses, and routes are schematic rather than real-time GPS.

## Features

- **Live map view** — patients, outage zones, ambulance bases, and moving ambulances plotted on an interactive Leaflet map with a custom dark theme.
- **Patient risk tracking** — each patient has a status (`stable` / `warning` / `danger`) driven by battery level, power status, and proximity to an active outage.
- **Outage simulation** — power outages appear, expand, and get restored over time, automatically affecting nearby patients.
- **Emergency dispatch** — ambulances can be dispatched to critical patients, with live ETA, on-scene, and return-to-base states shown on the map and in the ops panel.
- **Alert cascade feed** — a running log of events (outages, critical alerts, SAMU/caregiver/family notifications, dispatches) as they happen.
- **Stats overview** — at-a-glance counts of active patients, ongoing outages, and ambulances en route.

## Tech Stack

- [Next.js](https://nextjs.org/) 16 (App Router) + React 19 + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) 4 with [shadcn/ui](https://ui.shadcn.com/) components
- [Leaflet](https://leafletjs.com/) for the map view
- [Recharts](https://recharts.org/) for charts
- [Lucide](https://lucide.dev/) icons
- Package management via [pnpm](https://pnpm.io/)

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/installation)

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Build

```bash
pnpm build
pnpm start
```

## Project Structure

```
app/                    Next.js app router pages, global styles, and metadata
components/
  nafas/                Dashboard, map, navbar, patient table, alerts, and other feature components
  ui/                    Shared shadcn/ui primitives
lib/
  nafas/                Simulation engine, geo helpers, patient data, and shared types
  utils.ts               General utility helpers
public/                  Icons and static assets
```

## How the Simulation Works

Patient state, outages, and ambulance movement are generated and advanced client-side by a simulation loop (`lib/nafas/simulation.ts`), so the dashboard runs entirely in the browser with no backend required. Each tick updates patient battery levels, outage progress, and ambulance positions along their routes, and emits alert events that feed the live activity panel.

## License

This project is a demo/prototype and does not currently specify a license.
