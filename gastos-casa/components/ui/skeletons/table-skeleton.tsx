'use client'

import { Skeleton } from '@/components/common/loading-states'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface TableSkeletonProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  showFilters?: boolean
  showPagination?: boolean
}

export function TableSkeleton({ 
  rows = 8, 
  columns = 5, 
  showHeader = true,
  showFilters = false,
  showPagination = true 
}: TableSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      )}

      {/* Filters skeleton */}
      {showFilters && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table skeleton */}
      <Card>
        <CardContent className="p-0">
          <div className="border rounded-md">
            {/* Table header */}
            <div className="border-b bg-muted/50 p-4">
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {Array.from({ length: columns }).map((_, i) => (
                  <Skeleton key={i} className="h-4" delay={i * 50} />
                ))}
              </div>
            </div>
            
            {/* Table rows */}
            <div className="divide-y">
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="p-4">
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                    {Array.from({ length: columns }).map((_, colIndex) => (
                      <Skeleton 
                        key={colIndex} 
                        className={`h-6 ${colIndex === 0 ? 'w-3/4' : colIndex === columns - 1 ? 'w-1/2' : 'w-full'}`}
                        delay={rowIndex * 100 + colIndex * 25}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagination skeleton */}
      {showPagination && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-16" />
            <div className="flex space-x-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-8" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}