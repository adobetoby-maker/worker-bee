import { FlowBoardCanvas } from '@/components/flow-board/FlowBoardCanvas'

export const metadata = { title: 'Flow Boards — Worker-Bee' }

export default function FlowBoardsPage() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'white', lineHeight: 1 }}>Flow Boards</h1>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
            User journey maps pinned to a cork board — trace every step from landing page to paid subscriber
          </p>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid #3d3019' }}>
        <FlowBoardCanvas />
      </div>
    </div>
  )
}
