"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export default function TendenciaChart({ data }: { data: { mes: string; n: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <AreaChart data={data} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="tend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b8cff" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#9d6bff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="mes"
          tickFormatter={(m: string) => m.slice(5)}
          tick={{ fill: "#8a8fa3", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#0c0d12",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            fontSize: 12,
          }}
          labelStyle={{ color: "#8a8fa3" }}
          formatter={(v) => [Number(v).toLocaleString("pt-BR"), "licitações"]}
        />
        <Area type="monotone" dataKey="n" stroke="#9d6bff" strokeWidth={2} fill="url(#tend)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
