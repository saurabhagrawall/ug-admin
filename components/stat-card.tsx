export default function StatCard({
  label,
  value,
  hint,
  onClick,
}: {
  label: string;
  value: number | string;
  hint?: string;
  onClick?: () => void;
}) {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    onClick ? (
      <button onClick={onClick} className="text-left w-full rounded-xl border p-4 bg-white hover:bg-gray-50 transition">
        {children}
      </button>
    ) : (
      <div className="rounded-xl border p-4 bg-white">{children}</div>
    );

  return (
    <Wrapper>
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </Wrapper>
  );
}
