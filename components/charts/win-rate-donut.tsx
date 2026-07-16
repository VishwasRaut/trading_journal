"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

export function WinRateDonut({
  wins,
  losses,
}: {
  wins: number;
  losses: number;
}) {
  const total = wins + losses;
  const rate = total === 0 ? 0 : Math.round((wins / total) * 100);
  const data = [
    { name: "Wins", value: wins || 0.0001, color: "var(--profit)" },
    { name: "Losses", value: losses || 0.0001, color: "var(--loss)" },
  ];

  return (
    <div className="relative h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="70%"
            outerRadius="95%"
            paddingAngle={2}
            startAngle={90}
            endAngle={450}
            strokeWidth={0}
            animationDuration={800}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-3xl font-semibold">{rate}%</div>
          <div className="text-xs text-muted-foreground">
            {wins}W · {losses}L
          </div>
        </motion.div>
      </div>
    </div>
  );
}
