interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export default function Card({ children, className = '', title }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.35)] ${className}`.trim()}
    >
      {title && (
        <div className="border-b border-slate-200/70 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
