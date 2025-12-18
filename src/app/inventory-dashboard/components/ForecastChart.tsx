import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { ForecastDataPoint } from '@/types'

interface ForecastChartProps {
  data: ForecastDataPoint[] | undefined
}

export default function ForecastChart({ data }: ForecastChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>Insufficient data to generate forecast</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Find the index where actual data ends and projection begins
  const lastActualIndex = data.findIndex((d) => d.projected !== undefined && d.actual === undefined)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Forecast</CardTitle>
        <p className="text-sm text-muted-foreground">
          Historical data and projected sales
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />

            {/* Reference line separating actual from forecast */}
            {lastActualIndex > 0 && (
              <ReferenceLine
                x={data[lastActualIndex - 1]?.date}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                label={{
                  value: 'Forecast →',
                  position: 'top',
                  fill: '#64748b',
                  fontSize: 12,
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="actual"
              name="Historical"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#actualGradient)"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="projected"
              name="Projected"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#projectedGradient)"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Forecast based on historical average consumption rate
        </div>
      </CardContent>
    </Card>
  )
}
