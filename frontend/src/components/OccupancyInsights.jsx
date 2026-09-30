import { useEffect, useState } from "react";
import { api, inr } from "@/lib/api";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const OccupancyInsights = () => {
  const [months, setMonths] = useState(null);
  useEffect(() => { api.get("/host/insights").then((r) => setMonths(r.data.months)); }, []);
  if (!months) return null;
  const nights = months.reduce((s, m) => s + m.nights, 0), earn = months.reduce((s, m) => s + m.earnings, 0);
  return (
    <div data-testid="occupancy-insights" className="card-lux p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="font-serif text-2xl text-[#0F281E]">Occupancy & earnings</h3>
        <div className="text-xs text-[#5A655D]"><span data-testid="insights-total-nights" className="font-semibold text-[#0F281E]">{nights}</span> nights · <span data-testid="insights-total-earnings" className="font-semibold text-[#0F281E]">{inr(earn)}</span> across shown months</div>
      </div>
      <div className="h-64 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={months} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#EEE9DC" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5A655D" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="e" tick={{ fontSize: 10, fill: "#5A655D" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
            <YAxis yAxisId="o" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: "#C5A059" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(v, n) => (n === "Earnings" ? inr(v) : `${v}%`)} contentStyle={{ borderRadius: 12, border: "1px solid #E8E2D2", fontSize: 12 }} />
            <Bar yAxisId="e" dataKey="earnings" name="Earnings" fill="#0F281E" radius={[6, 6, 0, 0]} />
            <Line yAxisId="o" dataKey="occupancy" name="Occupancy" stroke="#C5A059" strokeWidth={2.5} dot={{ r: 3, fill: "#C5A059" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
        {months.slice(3, 6).map((m) => (
          <div key={m.key} data-testid={`insight-month-${m.key}`} className="rounded-lg bg-[#F8F6F0] p-2">
            <div className="text-[#5A655D]">{m.month}</div>
            <div className="font-semibold text-[#0F281E]">{m.occupancy}% · {inr(m.earnings)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
