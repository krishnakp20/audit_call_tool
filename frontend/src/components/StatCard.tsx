interface StatCardProps {
  title: string;
  value: string | number;
  accent?: string;
}

export function StatCard({ title, value, accent = "from-sky-500 to-violet-500" }: StatCardProps) {
  return (
    <div className="glass-card p-5">
      <div className={`mb-3 h-1 w-14 rounded-full bg-gradient-to-r ${accent}`} />
      <div className="text-sm text-slate-600">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
