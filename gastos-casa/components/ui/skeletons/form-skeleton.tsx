'use client'

import { Skeleton } from '@/components/common/loading-states'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface FormSkeletonProps {
  fields?: number
  showHeader?: boolean
  showActions?: boolean
  layout?: 'vertical' | 'horizontal' | 'grid'
}

export function FormSkeleton({ 
  fields = 6, 
  showHeader = true,
  showActions = true,
  layout = 'vertical'
}: FormSkeletonProps) {
  const gridClass = layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'
  
  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
      )}
      
      <CardContent className="space-y-6">
        <div className={gridClass}>
          {Array.from({ length: fields }).map((_, i) => (
            <FormFieldSkeleton 
              key={i} 
              layout={layout}
              delay={i * 100}
            />
          ))}
        </div>
        
        {showActions && (
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Skeleton className="h-10 w-20" delay={fields * 100} />
            <Skeleton className="h-10 w-24" delay={fields * 100 + 50} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface FormFieldSkeletonProps {
  layout: 'vertical' | 'horizontal' | 'grid'
  delay?: number
}

function FormFieldSkeleton({ layout, delay = 0 }: FormFieldSkeletonProps) {
  if (layout === 'horizontal') {
    return (
      <div className="flex items-center space-x-4">
        <Skeleton className="h-4 w-24 flex-shrink-0" delay={delay} />
        <Skeleton className="h-10 flex-1" delay={delay + 50} />
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" delay={delay} />
      <Skeleton className="h-10 w-full" delay={delay + 50} />
    </div>
  )
}

export function SelectFormSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-16" />
      <div className="relative">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="absolute right-3 top-3 h-4 w-4" />
      </div>
    </div>
  )
}

export function CheckboxFormSkeleton() {
  return (
    <div className="flex items-center space-x-2">
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

export function TextareaFormSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}