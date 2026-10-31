"use client";

import { useState } from "react";
import { StudentGrade } from "../../../lib/types/student";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface StudentGradeProps {
  data: StudentGrade[] | undefined;
}

const COLORS = [
  "#2563eb", // Blue
  "#16a34a", // Green
  "#9333ea", // Purple
  "#ea580c", // Orange
  "#0891b2", // Cyan
  "#db2777", // Pink
];

export default function StudentGradeComponent({ data }: StudentGradeProps) {
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/50 border border-white/30 rounded-2xl p-8 shadow-xl text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Riwayat Nilai</h2>
        <p className="text-slate-500">Belum ada data nilai untuk ditampilkan.</p>
      </div>
    );
  }

  // 1. Get unique subjects
  const subjects = Array.from(new Set(data.map((g) => g.subject)));

  // 2. Transform data for Recharts
  // We need to group by a common axis. Since assignments might have different names/dates,
  // we'll normalize by sequence (1st assignment, 2nd assignment, etc.) per subject.
  // Or if we strictly follow dates, we group by date.
  // Let's use a simple index-based approach for smooth visualization if dates are sparse,
  // OR group by Assignment Title if they are common (e.g. "Midterm", "Final").
  // Given the previous data, titles like "Algebra", "Geometry" are specific.
  // Strategy: Group by Date for a timeline view.

  const sortedData = [...data].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  );

  // We'll create a merged dataset where x-axis is the specific assignment instance
  // Since we want multiple lines, we can just map the specific subject's score
  // to a data point. However, Recharts categorical chart expects one object per X-axis tick.
  // If we simply plot them, we might get disjointed points if X-axis is "Assignment Name".
  // A better approach for "Progress per Period" is using the Date or simply plotting them sequentially.
  // Let's try plotting by "Assignment Index" (1, 2, 3...) to compare progress side-by-side,
  // OR just plot distinct points on a timeline.
  // The user prompt implies "Perkembangan per periode".

  // Let's create a timeline based chart.
  // To make lines continuous for each subject, we filter data per subject.
  // But Recharts needs a single array of objects for the `data` prop to share the X-Axis.
  // We will create a union of all dates/titles.

  // Simplified Approach for visual clarity:
  // Create a list of data points. For each point, we have { name: '...', Subject1: 80, Subject2: null }.
  // Recharts connects nulls if `connectNulls` is true.

  const timeline = sortedData.map(d => ({
    name: d.title, // or date
    date: d.submittedAt,
    subject: d.subject,
    score: d.score,
    fullData: d
  }));

  // Actually, plotting by simple index (1st, 2nd, 3rd assessment) is often better for comparing trajectories
  // if dates are not strictly aligned.
  // Let's use a "Normalized Assessment Index" approach.
  const subjectGrades: Record<string, StudentGrade[]> = {};
  subjects.forEach(sub => {
    subjectGrades[sub] = sortedData.filter(d => d.subject === sub);
  });

  const maxAssignments = Math.max(...Object.values(subjectGrades).map(g => g.length));
  const chartData = Array.from({ length: maxAssignments }).map((_, i) => {
    const point: any = { name: `Tugas ${i + 1}` };
    subjects.forEach(sub => {
      if (subjectGrades[sub][i]) {
        point[sub] = subjectGrades[sub][i].score;
        point[`${sub}_title`] = subjectGrades[sub][i].title; // for tooltip
      }
    });
    return point;
  });

  const handleLegendClick = (e: any) => {
    const subject = e.value;
    setActiveSubject(prev => prev === subject ? null : subject);
  };

  return (
    <div className="backdrop-blur-xl bg-white/50 border border-white/30 rounded-2xl p-8 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Riwayat Nilai per Mata Pelajaran</h2>

        {activeSubject && (
          <button
            onClick={() => setActiveSubject(null)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-lg transition-colors"
          >
            Tampilkan Semua
          </button>
        )}
      </div>

      <div className="space-y-8">
        {/* Chart Section */}
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={12}
                tickMargin={10}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                domain={[0, 100]}
              />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white/95 border border-slate-200 p-4 rounded-xl shadow-lg">
                        <p className="font-bold text-slate-700 mb-2">{label}</p>
                        {payload.map((p: any) => {
                          // Only show if activeSubject is null OR matches this payload
                          if (activeSubject && p.name !== activeSubject) return null;

                          return (
                            <div key={p.name} className="flex items-center gap-2 text-sm mb-1">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                              <span className="font-semibold text-slate-600">{p.name}:</span>
                              <span className="font-bold text-slate-800">{p.value}</span>
                              {/* Access extra data if possible, tricky with Recharts default payload structure */}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                onClick={handleLegendClick}
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value: any, entry: any) => {
                  const isActive = !activeSubject || activeSubject === value;
                  return (
                    <span style={{
                      color: '#475569',
                      fontWeight: isActive ? 700 : 400,
                      opacity: isActive ? 1 : 0.5,
                      cursor: 'pointer'
                    }}>
                      {value}
                    </span>
                  );
                }}
              />
              {subjects.map((subject, index) => {
                const isActive = !activeSubject || activeSubject === subject;
                const color = COLORS[index % COLORS.length];

                return (
                  <Line
                    key={subject}
                    type="monotone"
                    dataKey={subject}
                    stroke={color}
                    strokeWidth={activeSubject === subject ? 4 : 2}
                    strokeOpacity={isActive ? 1 : 0.2}
                    dot={{ r: isActive ? 4 : 0, fill: color, strokeWidth: 0 }}
                    activeDot={{ r: isActive ? 6 : 0 }}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* List Section (Contextual Data) */}
        <div className="grid gap-4">
          <h3 className="font-bold text-slate-700 text-lg">Detail Nilai</h3>
          {data.map((grade) => (
            <div
              key={grade.id}
              className={`bg-white/60 rounded-xl p-4 flex justify-between items-center border border-white/40 transition-all duration-300 ${
                activeSubject && activeSubject !== grade.subject ? 'opacity-40' : 'hover:bg-white/80 hover:shadow-md'
              }`}
            >
              <div>
                <p className="font-bold text-slate-800">
                  <span className="text-cyan-600 mr-2">[{grade.subject}]</span>
                  {grade.title}
                </p>
                <p className="text-sm text-slate-500">
                  {grade.type} • {new Date(grade.submittedAt).toLocaleDateString('id-ID')}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-lg font-bold px-3 py-1 rounded-lg ${
                    grade.score > 80
                      ? "bg-green-100 text-green-700"
                      : grade.score > 60
                        ? "bg-orange-100 text-orange-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {grade.score}
                </span>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Grade: {grade.grade}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
