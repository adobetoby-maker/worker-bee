import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  rot: number;
  vr: number;
}

interface Props {
  origin?: { x: number; y: number };
  count?: number;
  onDone?: () => void;
}

export function Confetti({ origin, count = 20, onDone }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [t, setT] = useState(0);

  useEffect(() => {
    const ox = origin?.x ?? window.innerWidth / 2;
    const oy = origin?.y ?? 60;
    const colors = ["#ffaa00", "#39ff14"];
    const init: Particle[] = Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 4 + Math.random() * 5;
      return {
        id: i,
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: colors[i % colors.length],
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 20,
      };
    });
    setParticles(init);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      setT(elapsed);
      if (elapsed < 1800) raf = requestAnimationFrame(tick);
      else onDone?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [origin, count, onDone]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[80]">
      {particles.map((p) => {
        const f = t / 16; // frames
        const x = p.x + p.vx * f;
        const y = p.y + p.vy * f + 0.25 * f * f; // gravity
        const opacity = Math.max(0, 1 - t / 1800);
        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 8,
              height: 12,
              background: p.color,
              transform: `rotate(${p.rot + p.vr * f}deg)`,
              opacity,
              boxShadow: `0 0 8px ${p.color}`,
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
}
