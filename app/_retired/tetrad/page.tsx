import TetradChat from './TetradChat'

export const metadata = { title: 'TETRAD — War Room' }

export default function TetradPage() {
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
      <TetradChat />
    </div>
  )
}
