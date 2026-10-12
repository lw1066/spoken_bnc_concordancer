import { useState } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { RectangleProps } from "recharts";

type CollocationDistributionChartProps = {
  collocate: string;
  target: string;
  positions: Record<string, number>;
  activePosition: number | null;
  onPositionClick?: (position: number) => void;
};

type ChartDatum = {
  position: string;
  numericPosition: number;
  frequency: number;
};

type CustomBarShapeProps = RectangleProps & {
  payload?: ChartDatum;
  activePosition: number | null;
  hoveredPosition: number | null;
  setHoveredPosition: (position: number | null) => void;
  onPositionClick?: (position: number) => void;
};

function CustomBarShape({
  x,
  y,
  width,
  height,
  payload,
  activePosition,
  hoveredPosition,
  setHoveredPosition,
  onPositionClick,
}: CustomBarShapeProps) {
  if (x == null || y == null || width == null || height == null || !payload) {
    return null;
  }

  const position = payload.numericPosition;
  const isActive = activePosition === position;
  const isHovered = hoveredPosition === position;

  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      radius={[4, 4, 0, 0]}
      fill={isActive || isHovered ? "#2563eb" : "#94a3b8"}
      style={{
        cursor: "pointer",
        transition: "fill 0.2s ease",
      }}
      tabIndex={0}
      role="button"
      aria-label={`Position ${payload.position}, frequency ${payload.frequency}`}
      onMouseEnter={() => setHoveredPosition(position)}
      onMouseLeave={() => setHoveredPosition(null)}
      onClick={() => onPositionClick?.(position)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPositionClick?.(position);
        }
      }}
    />
  );
}

export default function CollocationDistributionChart({
  collocate,
  target,
  positions,
  activePosition,
  onPositionClick,
}: CollocationDistributionChartProps) {
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);

  const positionNumbers = Object.keys(positions).map(Number);

  const leftWindow = Math.max(
    0,
    ...positionNumbers.filter((position) => position < 0).map(Math.abs),
  );

  const rightWindow = Math.max(
    0,
    ...positionNumbers.filter((position) => position > 0),
  );

  const chartData: ChartDatum[] = [
    ...Array.from({ length: leftWindow }, (_, index) => -(leftWindow - index)),
    ...Array.from({ length: rightWindow }, (_, index) => index + 1),
  ].map((position) => ({
    position: position > 0 ? `+${position}` : String(position),
    numericPosition: position,
    frequency: positions[String(position)] || 0,
  }));

  return (
    <div className="w-full">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-800">
          Position of "{collocate}" around "{target}"
        </h4>

        <p className="mt-1 text-xs text-slate-500">
          Negative positions are to the left of the target; positive positions
          are to the right.
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 10,
              right: 20,
              left: 10,
              bottom: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="position"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine
              label={{
                value: "Position relative to target",
                position: "insideBottom",
                offset: -5,
                fontSize: 12,
              }}
            />

            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine
              allowDecimals={false}
              width={60}
              label={{
                value: "Frequency",
                angle: -90,
                position: "insideLeft",
                fontSize: 12,
              }}
            />

            <Tooltip
              formatter={(value) => [
                Number(value).toLocaleString(),
                "Frequency",
              ]}
              labelFormatter={(label) => `Position: ${label}`}
            />

            <Bar
              dataKey="frequency"
              name="Frequency"
              shape={(props) => (
                <CustomBarShape
                  {...props}
                  activePosition={activePosition}
                  hoveredPosition={hoveredPosition}
                  setHoveredPosition={setHoveredPosition}
                  onPositionClick={onPositionClick}
                />
              )}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
