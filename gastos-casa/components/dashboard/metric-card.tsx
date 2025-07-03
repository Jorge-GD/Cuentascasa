'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { formatCurrency, formatPercentage, getVariationColor } from '@/lib/analytics/calculations'

interface MetricCardProps {
  title: string
  value: number
  format?: 'currency' | 'number' | 'percentage'
  change?: number
  icon: LucideIcon
  description?: string
  variant?: 'default' | 'positive' | 'negative'
}

export function MetricCard({
  title,
  value,
  format = 'number',
  change,
  icon: Icon,
  description,
  variant = 'default'
}: MetricCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val)
      case 'percentage':
        return formatPercentage(val)
      default:
        return val.toLocaleString('es-ES')
    }
  }

  const getCardClasses = () => {
    switch (variant) {
      case 'positive':
        return 'border-green-200 bg-green-50'
      case 'negative':
        return 'border-red-200 bg-red-50'
      default:
        return ''
    }
  }

  const getValueClasses = () => {
    switch (variant) {
      case 'positive':
        return 'text-green-700'
      case 'negative':
        return 'text-red-700'
      default:
        return ''
    }
  }

  return (
    <Card className={getCardClasses()}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getValueClasses()}`}>
          {formatValue(value)}
        </div>
        
        <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
          {change !== undefined && (
            <span className={getVariationColor(change, format === 'currency')}>
              {formatPercentage(change)}
            </span>
          )}
          {description && (
            <span>{description}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}