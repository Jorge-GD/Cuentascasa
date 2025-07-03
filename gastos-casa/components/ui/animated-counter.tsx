'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/analytics/calculations'

interface AnimatedCounterProps {
  value: number
  format?: 'number' | 'currency' | 'percentage'
  duration?: number
  className?: string
}

export function AnimatedCounter({ 
  value, 
  format = 'number', 
  duration = 1000,
  className 
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsAnimating(true)
    const startTime = Date.now()
    const startValue = displayValue

    const animate = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      
      const currentValue = startValue + (value - startValue) * easeOut
      setDisplayValue(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val)
      case 'percentage':
        return `${val.toFixed(1)}%`
      default:
        return Math.round(val).toLocaleString()
    }
  }

  return (
    <span className={`${className} ${isAnimating ? 'transition-all duration-100' : ''}`}>
      {formatValue(displayValue)}
    </span>
  )
}