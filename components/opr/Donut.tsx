"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#6366f1", "#a855f7", "#3b82f6", "#c084fc", "#22d3ee", "#e879f9", "#818cf8", "#60a5fa"];

export default function Donut({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="flex items-center gap-5">
      <ResponsiveContainer width={150} height={150}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={46} outerRadius={70} paddingAngle={2} stroke="none">
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "rgba(20,20,28,0.92)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, color: "#e7e9f0", backdropFilter: "blur(8px)" }}
            formatter={(v) => [Number(v).toLocaleString("pt-BR"), "licitações"]}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex-1 space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="truncate text-[var(--ink-soft)]">{d.name}</span>
            <span className="num ml-auto text-[var(--muted)]">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
