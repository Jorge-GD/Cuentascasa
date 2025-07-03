'use client'

import { Skeleton } from '@/components/common/loading-states'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ChartSkeleton } from './chart-skeleton'

interface DashboardSkeletonProps {
  layout?: 'standard' | 'compact' | 'detailed'
  showHeader?: boolean
  showMetrics?: boolean
  showCharts?: boolean
}

export function DashboardSkeleton({ 
  layout = 'standard',
  showHeader = true,
  showMetrics = true,
  showCharts = true
}: DashboardSkeletonProps) {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      {showMetrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MetricCardSkeleton key={i} delay={i * 100} />
          ))}
        </div>
      )}

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <div className="flex space-x-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      {showCharts && (
        <>
          {layout === 'detailed' ? (
            <DetailedChartsLayout />
          ) : layout === 'compact' ? (
            <CompactChartsLayout />
          ) : (
            <StandardChartsLayout />
          )}
        </>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" delay={i * 50} />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" delay={i * 50 + 25} />
                    <Skeleton className="h-3 w-24" delay={i * 50 + 50} />
                  </div>
                </div>
                <Skeleton className="h-6 w-16" delay={i * 50 + 75} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StandardChartsLayout() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartSkeleton type="line" showLegend />
      <ChartSkeleton type="pie" showLegend />
      <div className="lg:col-span-2">
        <ChartSkeleton type="bar" showLegend height="h-64" />
      </div>
    </div>
  )
}

function CompactChartsLayout() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <ChartSkeleton type="metric" showHeader={false} height="h-32" />
      <ChartSkeleton type="pie" showHeader={false} height="h-32" />
      <ChartSkeleton type="line" showHeader={false} height="h-32" />
    </div>
  )
}

function DetailedChartsLayout() {
  return (
    <div className="space-y-6">
      {/* Main chart */}
      <ChartSkeleton type="area" showLegend height="h-96" />
      
      {/* Secondary charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartSkeleton type="bar" />
        <ChartSkeleton type="pie" />
        <ChartSkeleton type="line" />
      </div>
      
      {/* Metrics grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ChartSkeleton key={i} type="metric" showHeader={false} height="h-24" />
        ))}
      </div>
    </div>
  )
}

interface MetricCardSkeletonProps {
  delay?: number
}

function MetricCardSkeleton({ delay = 0 }: MetricCardSkeletonProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" delay={delay} />
            <Skeleton className="h-8 w-24" delay={delay + 50} />
            <div className="flex items-center space-x-1">
              <Skeleton className="h-3 w-3" delay={delay + 100} />
              <Skeleton className="h-3 w-16" delay={delay + 125} />
            </div>
          </div>
          <Skeleton className="h-12 w-12 rounded-full" delay={delay + 150} />
        </div>
      </CardContent>
    </Card>
  )
}