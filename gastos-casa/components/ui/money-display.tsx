import { cn } from '@/lib/utils'

interface MoneyDisplayProps {
  amount: number
  className?: string
  showSign?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function MoneyDisplay({ 
  amount, 
  className, 
  showSign = true,
  size = 'md' 
}: MoneyDisplayProps) {
  const isPositive = amount >= 0
  const formattedAmount = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    signDisplay: showSign ? 'always' : 'auto'
  }).format(amount)

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold'
  }

  return (
    <span
      className={cn(
        sizeClasses[size],
        isPositive ? 'money-positive' : 'money-negative',
        className
      )}
    >
      {formattedAmount}
    </span>
  )
}