"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MoreHorizontal, PieChart, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { AnalyticsData } from "@/types/sprint";

const ACCENT = "#8b5cf6";

export function AnalyticsCharts({ data }: { data: AnalyticsData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:gap-6">
      <Card className="rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent">
              <TrendingUp className="size-4" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Daily Productivity</h2>
          </div>
          <MoreHorizontal className="size-4 text-zinc-400" />
        </div>
        <div className="mt-4 h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.daily}>
              <defs>
                <linearGradient id="productivityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="productivity"
                stroke={ACCENT}
                strokeWidth={2.5}
                fill="url(#productivityFill)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent">
              <PieChart className="size-4" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Category Completion</h2>
          </div>
          <MoreHorizontal className="size-4 text-zinc-400" />
        </div>
        <div className="mt-4 h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data.categories.map((item) => ({
                name: item.label,
                percent: item.total ? Math.round((item.completed / item.total) * 100) : 0,
              }))}
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={96}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                tickFormatter={(value: string) =>
                  value.length > 14 ? `${value.slice(0, 13)}…` : value
                }
              />
              <Tooltip />
              <Bar dataKey="percent" fill={ACCENT} radius={[0, 8, 8, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
