"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function ComboChart({ data }: { data: { mes: string; n: number; valor: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={270}>
      <ComposedChart data={data} margin={{ top: 10, right: 6, left: -6, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="mes"
          tickFormatter={(m: string) => m.slice(5)}
          tick={{ fill: "#8b93a7", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis yAxisId="l" tick={{ fill: "#8b93a7", fontSize: 11 }} axisLine={false} tickLine={false} width={34} />
        <YAxis
          yAxisId="r"
          orientation="right"
          tick={{ fill: "#6b7488", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v: number) => (v >= 1e6 ? (v / 1e6).toFixed(0) + "M" : (v / 1e3).toFixed(0) + "k")}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{ background: "rgba(20,20,28,0.92)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, color: "#e7e9f0", backdropFilter: "blur(8px)" }}
          formatter={(v, name) =>
            name === "Valor (R$)"
              ? ["R$ " + Number(v).toLocaleString("pt-BR"), name]
              : [Number(v).toLocaleString("pt-BR"), "Licitações"]
          }
        />
        <Bar yAxisId="l" dataKey="n" name="Licitações" fill="rgba(99,102,241,0.55)" radius={[4, 4, 0, 0]} barSize={16} />
        <Line yAxisId="r" type="monotone" dataKey="valor" name="Valor (R$)" stroke="#3b82f6" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
