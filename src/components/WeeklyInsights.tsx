import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { 
  TrendingUp, 
  Clock, 
  Zap, 
  Sparkles, 
  CalendarDays,
  CheckCircle2,
  Brain,
  Info
} from "lucide-react";

interface WeeklyData {
  day: string;
  focusHours: number;
  productivity: number;
}

const currentWeekData: WeeklyData[] = [
  { day: "Senin", focusHours: 5.5, productivity: 80 },
  { day: "Selasa", focusHours: 6.2, productivity: 85 },
  { day: "Rabu", focusHours: 7.0, productivity: 90 },
  { day: "Kamis", focusHours: 4.8, productivity: 65 },
  { day: "Jumat", focusHours: 6.5, productivity: 88 },
  { day: "Sabtu", focusHours: 3.5, productivity: 50 },
  { day: "Minggu", focusHours: 2.0, productivity: 45 }
];

const lastWeekData: WeeklyData[] = [
  { day: "Senin", focusHours: 4.8, productivity: 70 },
  { day: "Selasa", focusHours: 5.0, productivity: 72 },
  { day: "Rabu", focusHours: 6.8, productivity: 85 },
  { day: "Kamis", focusHours: 5.5, productivity: 78 },
  { day: "Jumat", focusHours: 5.8, productivity: 80 },
  { day: "Sabtu", focusHours: 4.0, productivity: 60 },
  { day: "Minggu", focusHours: 3.0, productivity: 55 }
];

export default function WeeklyInsights() {
  const [selectedWeek, setSelectedWeek] = useState<"current" | "last">("current");

  const data = selectedWeek === "current" ? currentWeekData : lastWeekData;

  // Calculative stats derived from selected week
  const totalFocusHours = data.reduce((acc, curr) => acc + curr.focusHours, 0);
  const averageFocusHours = (totalFocusHours / 7).toFixed(1);
  const averageProductivity = Math.round(data.reduce((acc, curr) => acc + curr.productivity, 0) / 7);

  // Custom polished Tooltip component for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-3 px-3.5 border border-sky-100/80 rounded-2xl shadow-lg space-y-1.5 text-xs text-slate-800" id="weekly-insights-tooltip">
          <p className="font-extrabold text-slate-900 border-b border-slate-100 pb-1 font-mono uppercase">Hari {label}</p>
          <p className="flex items-center gap-1.5 text-sky-600 font-bold font-mono text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            Durasi Fokus: {payload[0].value} Jam
          </p>
          {payload[1] && (
            <p className="flex items-center gap-1.5 text-emerald-600 font-bold font-mono text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Produktivitas: {payload[1].value}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-sky-100/80 rounded-2xl p-5 shadow-xs transition duration-200" id="weekly-insights-card">
      {/* Widget Header with Filter */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-sky-50">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-sky-700 uppercase tracking-widest block font-mono flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-sky-500 animate-pulse animate-spin-slow" /> Analisis Tren Bioritme
          </span>
          <h3 className="font-title font-black text-slate-900 tracking-tight text-sm sm:text-base flex items-center gap-2">
            <CalendarDays className="w-4.5 h-4.5 text-sky-500" /> Weekly Insights
          </h3>
        </div>

        <div className="inline-flex rounded-xl bg-slate-50 p-1 border border-slate-100 self-start shrink-0">
          <button
            type="button"
            onClick={() => setSelectedWeek("current")}
            className={`text-xs px-3.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer font-bold ${
              selectedWeek === "current"
                ? "bg-gradient-to-r from-sky-500 to-emerald-400 text-white shadow-3xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Minggu Ini
          </button>
          <button
            type="button"
            onClick={() => setSelectedWeek("last")}
            className={`text-xs px-3.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer font-bold ${
              selectedWeek === "last"
                ? "bg-gradient-to-r from-sky-500 to-emerald-400 text-white shadow-3xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Minggu Lalu
          </button>
        </div>
      </div>

      {/* Visual Dynamic Stats Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-4">
        <div className="bg-gradient-to-br from-sky-50/60 to-white border border-sky-105/30 p-3 rounded-2xl flex items-center gap-3">
          <div className="bg-sky-100 p-2.5 rounded-xl text-sky-600">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Total Durasi Fokus</span>
            <strong className="text-sm font-mono font-black text-slate-900">{totalFocusHours.toFixed(1)} <span className="text-[10px] text-slate-400 font-sans">Jam</span></strong>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-105/30 p-3 rounded-2xl flex items-center gap-3">
          <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Rata-rata Produktivitas</span>
            <strong className="text-sm font-mono font-black text-slate-900">{averageProductivity}%</strong>
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-50/40 to-white border border-teal-105/20 p-3 rounded-2xl flex items-center gap-3">
          <div className="bg-teal-100 p-2.5 rounded-xl text-teal-6002">
            <Brain className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Performa Sirkadian</span>
            <strong className="text-[11px] font-bold text-emerald-700 bg-emerald-50/80 px-2.5 py-0.5 rounded-full border border-emerald-100/50">Optimal 🌟</strong>
          </div>
        </div>
      </div>

      {/* The Recharts Bar Chart Container */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 5, left: -25, bottom: 5 }}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="day" 
              tick line={false} 
              tickLine={false} 
              style={{ fontSize: "10px", fill: "#64748b", fontWeight: "600" }} 
            />
            {/* Dual Y-Axes to represent hours (Left) and % productivity (Right) perfectly */}
            <YAxis 
              yAxisId="left"
              orientation="left"
              stroke="#64748b"
              tickLine={false}
              axisLine={false}
              style={{ fontSize: "10px", fill: "#64748b", fontWeight: "600" }}
              unit="h"
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#64748b"
              tickLine={false}
              axisLine={false}
              style={{ fontSize: "10px", fill: "#64748b", fontWeight: "600" }}
              unit="%"
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#eff6ff", opacity: 0.8 }} />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }}
            />
            {/* Bar 1: Focus duration using beautiful gradient Sky Blue look */}
            <Bar 
              yAxisId="left"
              dataKey="focusHours" 
              name="Durasi Fokus (Jam)" 
              fill="#0ea5e9" 
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            {/* Bar 2: Productivity score using beautiful Fresh Green look */}
            <Bar 
              yAxisId="right"
              dataKey="productivity" 
              name="Produktivitas (%)" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer hint */}
      <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-start gap-2 text-[10px] text-slate-500 mt-2 leading-relaxed">
        <Info className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
        <p>
          Grafis ini membandingkan <strong>Durasi Fokus Kerja</strong> (skala kiri) dengan indeks <strong>Produktivitas Sirkadian</strong> (skala kanan) Anda. Jadwal yang seimbang mendelegasikan porsi istirahat reguler sirkadian sehingga tren energi selalu stabil.
        </p>
      </div>
    </div>
  );
}
