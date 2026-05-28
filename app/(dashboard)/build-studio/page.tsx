import BuildStudioClient from './BuildStudioClient'

export const metadata = { title: 'Build Studio — Worker-Bee' }

export default function BuildStudioPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white leading-none">Build Studio</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Terminal + live preview — connect via Tailscale for full access
          </p>
        </div>
      </div>
      <BuildStudioClient />
    </div>
  )
}
