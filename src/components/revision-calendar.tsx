"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface CalendarDay {
  completed: number;
  scheduled: number;
}

interface CalendarData {
  dates: Record<string, CalendarDay>;
  year: number;
  month: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RevisionCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<CalendarData>("/revisions/calendar", {
        params: { year, month },
      });
      setData(res.data);
    } catch {
      // silent
    }
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const goToPrev = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNext = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const goToToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-lg border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToPrev}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToNext}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={goToToday}>
          Today
        </Button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-[10px] text-center text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className={`grid grid-cols-7 gap-px ${loading ? "opacity-50" : ""}`}>
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="h-10" />;
          }

          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayData = data?.dates[dateStr];
          const isToday = dateStr === todayStr;
          const completed = dayData?.completed || 0;
          const scheduled = dayData?.scheduled || 0;

          return (
            <div
              key={dateStr}
              className={`h-10 flex flex-col items-center justify-center rounded-md text-xs relative ${
                isToday
                  ? "bg-primary/10 font-bold text-primary"
                  : "hover:bg-accent/50"
              }`}
            >
              <span>{day}</span>
              {(completed > 0 || scheduled > 0) && (
                <div className="flex gap-0.5 mt-0.5">
                  {completed > 0 && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-green-500"
                      title={`${completed} completed`}
                    />
                  )}
                  {scheduled > 0 && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-violet-500"
                      title={`${scheduled} scheduled`}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Completed
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-violet-500" />
          Scheduled
        </div>
      </div>
    </div>
  );
}
