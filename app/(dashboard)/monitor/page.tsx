import MonitorGrid from './MonitorGrid'

export const metadata = { title: 'Site Monitor — Worker-Bee' }

export default function MonitorPage() {
  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Site Monitor</h1>
        <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
          Live uptime checks across all registered sites — auto-refreshes every 60 seconds.
        </p>
      </div>
      <MonitorGrid />
    </div>
  )
}
