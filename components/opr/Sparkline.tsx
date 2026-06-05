"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

export default function Sparkline({ data, color = "#7c3aed" }: { data: number[]; color?: string }) {
  const d = data.map((n, i) => ({ i, n }));
  const id = "sp" + color.replace("#", "");
  return (
    <ResponsiveContainer width="100%" height={34}>
      <AreaChart data={d} margin={{ top: 3, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="n"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
