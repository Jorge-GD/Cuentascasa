'use client'

import { Skeleton } from '@/components/common/loading-states'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface ChartSkeletonProps {
  type?: 'line' | 'bar' | 'pie' | 'area' | 'metric'
  showHeader?: boolean
  showLegend?: boolean
  height?: string
}

export function ChartSkeleton({ 
  type = 'line',
  showHeader = true,
  showLegend = true,
  height = "h-80"
}: ChartSkeletonProps) {
  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
      )}
      
      <CardContent>
        <div className="space-y-4">
          {showLegend && type !== 'metric' && (
            <div className="flex flex-wrap gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Skeleton className="h-3 w-3 rounded-full" delay={i * 50} />
                  <Skeleton className="h-3 w-16" delay={i * 50 + 25} />
                </div>
              ))}
            </div>
          )}
          
          <div className={`w-full ${height} relative`}>
            {type === 'pie' ? (
              <PieChartSkeleton />
            ) : type === 'metric' ? (
              <MetricChartSkeleton />
            ) : (
              <LineBarChartSkeleton type={type} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LineBarChartSkeleton({ type }: { type: 'line' | 'bar' | 'area' }) {
  return (
    <div className="h-full flex flex-col">
      {/* Y-axis labels */}
      <div className="flex h-full">
        <div className="flex flex-col justify-between py-4 pr-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-8" delay={i * 30} />
          ))}
        </div>
        
        {/* Chart area */}
        <div className="flex-1 relative">
          {type === 'line' && <LineChartContent />}
          {type === 'bar' && <BarChartContent />}
          {type === 'area' && <AreaChartContent />}
        </div>
      </div>
      
      {/* X-axis labels */}
      <div className="flex justify-between pt-2 pl-12">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-12" delay={200 + i * 50} />
        ))}
      </div>
    </div>
  )
}

function LineChartContent() {
  return (
    <div className="h-full relative">
      {/* Grid lines */}
      <div className="absolute inset-0 flex flex-col justify-between">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-px w-full" delay={100 + i * 20} />
        ))}
      </div>
      
      {/* Line path simulation */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="skeleton-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--muted))" />
            <stop offset="50%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--muted))" />
          </linearGradient>
        </defs>
        <path 
          d="M0,80 Q25,60 50,70 T100,50 T150,65 T200,45 T250,60 T300,40" 
          stroke="url(#skeleton-gradient)" 
          strokeWidth="2" 
          fill="none"
          className="animate-pulse"
        />
      </svg>
    </div>
  )
}

function BarChartContent() {
  return (
    <div className="h-full flex items-end justify-between px-2">
      {Array.from({ length: 8 }).map((_, i) => {
        const heights = ['h-1/2', 'h-3/4', 'h-2/3', 'h-5/6', 'h-1/3', 'h-4/5', 'h-1/2', 'h-2/3']
        return (
          <Skeleton 
            key={i} 
            className={`w-8 ${heights[i]} rounded-t`} 
            delay={150 + i * 30}
          />
        )
      })}
    </div>
  )
}

function AreaChartContent() {
  return (
    <div className="h-full relative">
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path 
          d="M0,80 Q25,60 50,70 T100,50 T150,65 T200,45 T250,60 T300,40 L300,100 L0,100 Z" 
          fill="url(#area-gradient)"
          className="animate-pulse"
        />
      </svg>
    </div>
  )
}

function PieChartSkeleton() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="relative">
        <Skeleton className="h-48 w-48 rounded-full" />
        <Skeleton className="absolute inset-6 h-36 w-36 rounded-full bg-background" />
        
        {/* Pie segments simulation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-48 w-48">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 animate-pulse"
                style={{
                  transform: `rotate(${i * 60}deg)`,
                  transformOrigin: 'center',
                }}
              >
                <div 
                  className="h-1 w-24 bg-muted-foreground/20 absolute top-1/2 left-1/2"
                  style={{ transformOrigin: 'left center' }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricChartSkeleton() {
  return (
    <div className="flex items-center justify-between h-full">
      <div className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-12 w-32" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <Skeleton className="h-20 w-20 rounded-full" />
    </div>
  )
}