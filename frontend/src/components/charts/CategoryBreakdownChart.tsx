import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { cn, toTitleCase } from '@/lib/utils'

interface CategoryBreakdownChartProps {
  semantic: number | null
  skill: number | null
  experience: number | null
  className?: string
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: { category: string; score: number } }>
}) => {
  if (!active || !payload?.length) return null
  const { category, score } = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-foreground">{category}</p>
      <p className="text-muted-foreground">
        Score: <span className="font-semibold text-foreground">{score}</span>
      </p>
    </div>
  )
}

export function CategoryBreakdownChart({
  semantic,
  skill,
  experience,
  className,
}: CategoryBreakdownChartProps) {
  const data = [
    { category: 'Semantic Match', score: Math.round(semantic ?? 0), fullMark: 100 },
    { category: 'Skill Coverage', score: Math.round(skill ?? 0), fullMark: 100 },
    { category: 'Experience', score: Math.round(experience ?? 0), fullMark: 100 },
  ]

  return (
    <div className={cn('w-full h-56', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(v: string) => toTitleCase(v)}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#4f46e5"
            fill="#4f46e5"
            fillOpacity={0.2}
            strokeWidth={2}
            isAnimationActive
            animationDuration={900}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
