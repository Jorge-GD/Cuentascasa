'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { formatCurrency, formatPercentage, getVariationColor } from '@/lib/analytics/calculations'
import { COLORS, getIncomeColor, getExpenseColor } from '@/lib/constants/colors'

interface MetricCardProps {
  title: string
  value: number
  format?: 'currency' | 'number' | 'percentage'
  change?: number
  icon: LucideIcon
  description?: string
  variant?: 'default' | 'positive' | 'negative' | 'neutral'
  tooltip?: string
}

export function MetricCard({
  title,
  value,
  format = 'number',
  change,
  icon: Icon,
  description,
  variant = 'default',
  tooltip
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

  const getCardStyle = () => {
    switch (variant) {
      case 'positive':
        return {
          borderColor: getIncomeColor('light'),
          backgroundColor: getIncomeColor('background')
        }
      case 'negative':
        return {
          borderColor: getExpenseColor('light'),
          backgroundColor: getExpenseColor('background')
        }
      default:
        return {}
    }
  }

  const getValueStyle = () => {
    switch (variant) {
      case 'positive':
        return { color: getIncomeColor('dark') }
      case 'negative':
        return { color: getExpenseColor('dark') }
      default:
        return {}
    }
  }

  return (
    <Card style={getCardStyle()}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {title}
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" style={getValueStyle()}>
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