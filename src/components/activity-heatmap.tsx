"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import api from "@/lib/api";

interface ActivityData {
  activity: Record<string, number>;
  start_date: string;
  end_date: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function getIntensity(count: number): string {
  if (count === 0) return "fill-[#ebedf0] dark:fill-[#161b22]";
  if (count === 1) return "fill-[#9be9a8] dark:fill-[#0e4429]";
  if (count <= 3) return "fill-[#40c463] dark:fill-[#006d32]";
  if (count <= 5) return "fill-[#30a14e] dark:fill-[#26a641]";
  return "fill-[#216e39] dark:fill-[#39d353]";
}

interface CellData {
  date: Date;
  count: number;
  dateStr: string;
}

export function ActivityHeatmap() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ActivityData>("/revisions/activity", {
        params: { months: 12 },
      });
      setData(res.data);
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Auto-scroll to the right (current date) once data loads
  useEffect(() => {
    if (data && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data]);

  if (loading || !data) {
    return (
      <div className="rounded-lg border bg-card p-5">
        <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">
          {loading ? "Loading activity..." : ""}
        </div>
      </div>
    );
  }

  // Build weeks grid going back ~1 year, ending on today's Saturday (end of week)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // End on the Saturday of today's week (so the current week is fully rendered)
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // move to Saturday

  // Start ~1 year back, aligned to Sunday
  const startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate() + 1);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // align to Sunday

  const weeks: CellData[][] = [];
  let currentWeek: CellData[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const yr = cursor.getFullYear();
    const mo = String(cursor.getMonth() + 1).padStart(2, "0");
    const dy = String(cursor.getDate()).padStart(2, "0");
    const dateStr = `${yr}-${mo}-${dy}`;
    const isFuture = cursor > today;
    currentWeek.push({
      date: new Date(cursor),
      count: isFuture ? -1 : (data.activity[dateStr] || 0),
      dateStr,
    });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Month labels — position by week index
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstDay = week[0];
    if (firstDay && firstDay.date.getMonth() !== lastMonth) {
      lastMonth = firstDay.date.getMonth();
      monthLabels.push({ label: MONTHS[lastMonth], weekIndex: wi });
    }
  });

  const totalRevisions = Object.values(data.activity).reduce((sum, c) => sum + c, 0);
  const activeDays = Object.values(data.activity).filter((c) => c > 0).length;

  // SVG dimensions — GitHub-style
  const cellSize = 13;
  const cellGap = 3;
  const cellStep = cellSize + cellGap;
  const headerHeight = 20;
  const gridWidth = weeks.length * cellStep;
  const gridHeight = headerHeight + 7 * cellStep;
  const dayLabelWidth = 36;

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium">
          {totalRevisions} revision{totalRevisions !== 1 ? "s" : ""} in the last year
        </span>
        <span className="text-xs text-muted-foreground">
          {activeDays} active day{activeDays !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex">
        {/* Fixed day labels on the left */}
        <div className="shrink-0" style={{ width: dayLabelWidth }}>
          <svg width={dayLabelWidth} height={gridHeight} className="block">
            {DAY_LABELS.map((label, i) =>
              label ? (
                <text
                  key={i}
                  x={0}
                  y={headerHeight + i * cellStep + cellSize - 2}
                  className="fill-muted-foreground text-[11px]"
                >
                  {label}
                </text>
              ) : null
            )}
          </svg>
        </div>

        {/* Scrollable grid */}
        <div className="overflow-x-auto flex-1 min-w-0" ref={scrollRef}>
          <svg width={gridWidth} height={gridHeight} className="block">
            {/* Month labels */}
            {monthLabels.map((m) => (
              <text
                key={`${m.label}-${m.weekIndex}`}
                x={m.weekIndex * cellStep}
                y={12}
                className="fill-muted-foreground text-[11px]"
              >
                {m.label}
              </text>
            ))}

            {/* Grid cells */}
            {weeks.map((week, wi) =>
              week.map((cell, di) =>
                cell.count === -1 ? null : (
                  <HeatmapCell
                    key={cell.dateStr}
                    x={wi * cellStep}
                    y={headerHeight + di * cellStep}
                    size={cellSize}
                    cell={cell}
                    isToday={cell.dateStr === todayStr}
                  />
                )
              )
            )}
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-[3px] mt-3">
        <span className="text-[11px] text-muted-foreground mr-1">Less</span>
        {[
          "fill-[#ebedf0] dark:fill-[#161b22]",
          "fill-[#9be9a8] dark:fill-[#0e4429]",
          "fill-[#40c463] dark:fill-[#006d32]",
          "fill-[#30a14e] dark:fill-[#26a641]",
          "fill-[#216e39] dark:fill-[#39d353]",
        ].map((cls, i) => (
          <svg key={i} width={13} height={13}>
            <rect width={13} height={13} rx={2} className={cls} />
          </svg>
        ))}
        <span className="text-[11px] text-muted-foreground ml-1">More</span>
      </div>
    </div>
  );
}

function HeatmapCell({
  x,
  y,
  size,
  cell,
  isToday,
}: {
  x: number;
  y: number;
  size: number;
  cell: CellData;
  isToday: boolean;
}) {
  const formatted = cell.date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const label =
    cell.count === 0
      ? `No revisions on ${formatted}`
      : `${cell.count} revision${cell.count !== 1 ? "s" : ""} on ${formatted}`;

  return (
    <Tooltip>
      <TooltipTrigger render={<g />}>
        <rect
          x={x}
          y={y}
          width={size}
          height={size}
          rx={2}
          className={`${getIntensity(cell.count)} ${isToday ? "stroke-primary stroke-[1.5]" : ""}`}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
