import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type CollocationDistributionChartProps = {
  collocate: string;
  target: string;
  positions: Record<string, number>;
  onPositionClick?: (position: number) => void;
};

export default function CollocationDistributionChart({
  collocate,
  target,
  positions,
  onPositionClick,
}: CollocationDistributionChartProps) {
  const positionNumbers = Object.keys(positions).map(Number);

  const leftWindow = Math.max(
    0,
    ...positionNumbers.filter((position) => position < 0).map(Math.abs),
  );

  const rightWindow = Math.max(
    0,
    ...positionNumbers.filter((position) => position > 0),
  );
  const chartData = [
    ...Array.from({ length: leftWindow }, (_, index) => -(leftWindow - index)),
    ...Array.from({ length: rightWindow }, (_, index) => index + 1),
  ].map((position) => ({
    position: position > 0 ? `+${position}` : String(position),
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
              radius={[4, 4, 0, 0]}
              onClick={(_, index) => {
                if (!onPositionClick) return;

                const position = chartData[index];

                if (!position) return;

                const numericPosition = position.position.startsWith("+")
                  ? Number(position.position.slice(1))
                  : Number(position.position);

                if (!Number.isNaN(numericPosition) && numericPosition !== 0) {
                  onPositionClick(numericPosition);
                }
              }}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
