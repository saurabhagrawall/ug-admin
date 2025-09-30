export default function StatusBadge({ value }: { value: string }) {
  const map: Record<string,string> = {
    Exploring: 'bg-slate-100 text-slate-700',
    Shortlisting: 'bg-amber-100 text-amber-800',
    Applying: 'bg-blue-100 text-blue-800',
    Submitted: 'bg-emerald-100 text-emerald-800',
  };
  return <span className={`inline-block px-2 py-1 rounded-md text-xs ${map[value] ?? 'bg-slate-100'}`}>{value}</span>;
}
