import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number // 0-100
  max?: number
  indicatorClassName?: string
  showValue?: boolean
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, indicatorClassName, showValue, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn(
          'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            indicatorClassName ?? 'bg-primary',
          )}
          style={{ width: `${percentage}%` }}
        />
        {showValue && (
          <span className="sr-only">{Math.round(percentage)}%</span>
        )}
      </div>
    )
  },
)
Progress.displayName = 'Progress'

export { Progress }
