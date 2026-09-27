'use client'

import dynamic from 'next/dynamic'
import { Activity } from 'lucide-react'

const Dashboard = dynamic(() => import('./dashboard').then((m) => m.Dashboard), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center gap-3 text-muted-foreground">
      <Activity className="size-5 animate-pulse text-danger" aria-hidden="true" />
      <span className="font-mono text-sm tracking-wide">Connecting to NAFAS nodes…</span>
    </div>
  ),
})

export function DashboardLoader() {
  return <Dashboard />
}
