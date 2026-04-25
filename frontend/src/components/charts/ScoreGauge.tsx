import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'
import { scoreColor } from '@/types'
import { cn } from '@/lib/utils'

interface ScoreGaugeProps {
  score: number | null
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showLabel?: boolean
}

const SIZES = {
  sm: { container: 100, inner: 48, fontSize: 'text-xl', sub: 'text-xs' },
  md: { container: 160, inner: 72, fontSize: 'text-3xl', sub: 'text-sm' },
  lg: { container: 220, inner: 96, fontSize: 'text-5xl', sub: 'text-base' },
}

// Gradient stops: red(0) → amber(50) → emerald(100)
function getGradientId(score: number | null) {
  return `gauge-gradient-${score ?? 'null'}`
}

export function ScoreGauge({
  score,
  label = 'Overall Score',
  size = 'md',
  className,
  showLabel = true,
}: ScoreGaugeProps) {
  const config = SIZES[size]
  const value = score ?? 0
  const color = scoreColor(score)
  const gradId = getGradientId(score)

  // Radial bar fills from bottom (180°) clockwise
  const data = [{ value, fill: `url(#${gradId})` }]

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width: config.container, height: config.container }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="65%"
            outerRadius="100%"
            barSize={12}
            data={data}
            startAngle={225}
            endAngle={-45}
          >
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="45%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
            </defs>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            {/* Background track */}
            <RadialBar
              dataKey="value"
              cornerRadius={6}
              background={{ fill: 'hsl(var(--secondary))' }}
              data={[{ value: 100, fill: 'transparent' }]}
              isAnimationActive={false}
            />
            <RadialBar
              dataKey="value"
              cornerRadius={6}
              background={false}
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {score !== null ? (
            <>
              <span
                className={cn('font-bold leading-none tabular-nums', config.fontSize)}
                style={{ color }}
              >
                {Math.round(score)}
              </span>
              <span className={cn('text-muted-foreground font-medium', config.sub)}>/ 100</span>
            </>
          ) : (
            <span className={cn('text-muted-foreground', config.sub)}>N/A</span>
          )}
        </div>
      </div>

      {showLabel && (
        <p className="text-sm font-medium text-muted-foreground text-center leading-tight">
          {label}
        </p>
      )}
    </div>
  )
}
