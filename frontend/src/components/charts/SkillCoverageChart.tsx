import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { cn } from '@/lib/utils'

interface SkillCoverageChartProps {
  matched: number
  missing: number
  className?: string
}

const COLORS = {
  matched: '#16a34a',
  missing: '#ef4444',
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { percent: number } }>
}) => {
  if (!active || !payload?.length) return null
  const { name, value, payload: inner } = payload[0]
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-foreground">{name}</p>
      <p className="text-muted-foreground">
        {value} skills{' '}
        <span className="font-semibold text-foreground">
          ({Math.round(inner.percent * 100)}%)
        </span>
      </p>
    </div>
  )
}

const CustomLegend = ({
  payload,
}: {
  payload?: Array<{ value: string; color: string }>
}) => (
  <ul className="flex justify-center gap-4 mt-1">
    {payload?.map((entry, idx) => (
      <li key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: entry.color }}
        />
        {entry.value}
      </li>
    ))}
  </ul>
)

export function SkillCoverageChart({ matched, missing, className }: SkillCoverageChartProps) {
  const total = matched + missing
  const data = [
    { name: 'Matched Skills', value: matched },
    { name: 'Missing Skills', value: missing },
  ]

  if (total === 0) {
    return (
      <div className={cn('flex items-center justify-center h-48 text-muted-foreground text-sm', className)}>
        No skill data available
      </div>
    )
  }

  const coveragePercent = total > 0 ? Math.round((matched / total) * 100) : 0

  return (
    <div className={cn('w-full', className)}>
      <div className="relative h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={3}
              dataKey="value"
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            >
              <Cell fill={COLORS.matched} />
              <Cell fill={COLORS.missing} />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-foreground">{coveragePercent}%</span>
          <span className="text-xs text-muted-foreground">Coverage</span>
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
        <span>
          <strong className="text-success">{matched}</strong> matched
        </span>
        <span>
          <strong className="text-destructive">{missing}</strong> missing
        </span>
        <span>
          <strong className="text-foreground">{total}</strong> total
        </span>
      </div>
    </div>
  )
}
