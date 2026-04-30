interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export default function Card({ children, className = '', title }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-[#e4dacd] bg-white shadow-[0_18px_45px_-32px_rgba(28,21,15,0.35)] ${className}`.trim()}
    >
      {title && (
        <div className="border-b border-[#ebe2d5] px-6 py-4">
          <h3 className="text-base font-semibold text-[#251d17]">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
