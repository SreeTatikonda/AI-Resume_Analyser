import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted skeleton-shimmer', className)}
      aria-hidden="true"
      {...props}
    />
  )
}

export { Skeleton }
