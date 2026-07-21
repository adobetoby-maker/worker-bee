export default function Section({
  children,
  className = "",
  id,
  narrow,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  narrow?: boolean;
}) {
  return (
    <section id={id} className={`relative py-20 md:py-28 ${className}`}>
      <div
        className={`container-vault ${
          narrow ? "max-w-3xl" : ""
        }`}
      >
        {children}
      </div>
    </section>
  );
}
