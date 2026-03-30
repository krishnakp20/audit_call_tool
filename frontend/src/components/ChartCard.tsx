import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="glass-card p-4">
      <h3 className="mb-3 text-sm font-medium text-slate-700">{title}</h3>
      <div className="h-72 w-full">{children}</div>
    </div>
  );
}
