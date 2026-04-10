import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  accent?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  growth: string;
  type?: "blue" | "green" | "amber" | "red" | "purple" | "indigo";
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


export function MetricCard({
  title,
  value,
  growth,
  type = "blue"
}: MetricCardProps) {
  const isNegative = growth.startsWith("-");

  const styles = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    red: "bg-red-50 border-red-200 text-red-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    indigo: "bg-indigo-100 border-indigo-200 text-indigo-700 "
  };

  return (
    <div
      className={`border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${styles[type]}`}
    >
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-600">{title}</p>

        <div className="flex items-end justify-between">
          <p className={`text-3xl font-bold ${styles[type].split(" ")[2]}`}>
            {value}
          </p>

          <div
            className={`flex items-center gap-1 text-sm ${
              isNegative ? "text-red-600" : "text-green-600"
            }`}
          >
            {isNegative ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <TrendingUp className="w-4 h-4" />
            )}
            <span>{growth}</span>
          </div>
        </div>
      </div>
    </div>
  );
}