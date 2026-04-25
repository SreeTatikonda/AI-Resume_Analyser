import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn, toTitleCase } from '@/lib/utils'
import { scoreColor } from '@/types'
import type { SectionBreakdown } from '@/types'

interface SectionScoresBarProps {
  data: SectionBreakdown
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

interface ChartEntry {
  section: string
  score: number
  color: string
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: ChartEntry }>
}) => {
  if (!active || !payload?.length) return null
  const { section, score } = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-foreground">{section}</p>
      <p className="text-muted-foreground">
        Score: <span className="font-semibold text-foreground">{Math.round(score)}</span>
      </p>
    </div>
  )
}

export function SectionScoresBar({ data, className, orientation = 'horizontal' }: SectionScoresBarProps) {
  const entries: ChartEntry[] = Object.entries(data)
    .filter(([, v]) => typeof v === 'number')
    .map(([key, value]) => ({
      section: toTitleCase(key),
      score: Math.round(value),
      color: scoreColor(value),
    }))
    .sort((a, b) => b.score - a.score)

  if (entries.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-40 text-muted-foreground text-sm', className)}>
        No section data available
      </div>
    )
  }

  const isHorizontal = orientation === 'horizontal'
  const chartHeight = Math.max(200, entries.length * 44)

  if (isHorizontal) {
    return (
      <div className={cn('w-full', className)} style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={entries}
            layout="vertical"
            margin={{ top: 4, right: 48, bottom: 4, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="section"
              width={110}
              tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
            <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={28} isAnimationActive animationDuration={800}>
              {entries.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
              <LabelList
                dataKey="score"
                position="right"
                formatter={(v: number) => `${v}`}
                style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Vertical bar chart
  return (
    <div className={cn('w-full h-64', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={entries} margin={{ top: 16, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="section"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
          <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={40} isAnimationActive animationDuration={800}>
            {entries.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
            <LabelList
              dataKey="score"
              position="top"
              formatter={(v: number) => `${v}`}
              style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
