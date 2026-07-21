export default function Eyebrow({
  num,
  children,
}: {
  num?: string;
  children: React.ReactNode;
}) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-bullion-300">
      {num && <span className="opacity-60">§ {num}</span>}
      {num && <span className="opacity-60">&nbsp;&nbsp;·&nbsp;&nbsp;</span>}
      {children}
    </p>
  );
}
