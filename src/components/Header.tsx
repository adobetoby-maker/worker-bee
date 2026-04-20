import { ClawLogo } from "./ClawLogo";
import { StatusBadge } from "./StatusBadge";

interface HeaderProps {
  connected: boolean;
  model: string | null;
  toolCount: number;
  active?: boolean;
}

export function Header({ connected, model, toolCount, active }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-5 bg-background/85 backdrop-blur border-b border-primary/30"
      style={{ height: 58 }}
    >
      <div className="flex items-center gap-3">
        <span className="text-primary">
          <ClawLogo size={28} active={active ?? connected} />
        </span>
        <span className="font-mono text-lg font-bold tracking-[0.28em] select-none">
          <span className="text-primary">OPEN</span>
          <span className="text-success">CLAW</span>
        </span>
        <span className="ml-3 hidden md:inline font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          // local agent runtime
        </span>
      </div>

      <div className="flex items-center gap-2">
        {connected ? (
          <StatusBadge variant="success" dot>
            OLLAMA::CONNECTED
          </StatusBadge>
        ) : (
          <StatusBadge variant="destructive">OLLAMA::OFFLINE</StatusBadge>
        )}
        <StatusBadge variant="primary">
          [ MODEL: {model ?? "none"} ]
        </StatusBadge>
        <StatusBadge variant="default">[ TOOLS: {toolCount} ]</StatusBadge>
      </div>
    </header>
  );
}
