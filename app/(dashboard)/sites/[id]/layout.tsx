import TerminalDrawer from './TerminalDrawer'

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TerminalDrawer />
    </>
  )
}
