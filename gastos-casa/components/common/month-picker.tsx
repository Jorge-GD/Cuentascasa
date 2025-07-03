'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface MonthPickerProps {
  value: Date
  onChange: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  className?: string
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function MonthPicker({ value, onChange, minDate, maxDate, className }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [displayYear, setDisplayYear] = useState(value.getFullYear())

  const currentMonth = value.getMonth()
  const currentYear = value.getFullYear()

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(displayYear, monthIndex, 1)
    onChange(startOfMonth(newDate))
    setIsOpen(false)
  }

  const handleYearChange = (direction: 'prev' | 'next') => {
    const newYear = direction === 'prev' ? displayYear - 1 : displayYear + 1
    setDisplayYear(newYear)
  }

  const isMonthDisabled = (monthIndex: number) => {
    const testDate = new Date(displayYear, monthIndex, 1)
    
    if (minDate && testDate < startOfMonth(minDate)) {
      return true
    }
    
    if (maxDate && testDate > startOfMonth(maxDate)) {
      return true
    }
    
    return false
  }

  const goToPreviousMonth = () => {
    const newDate = subMonths(value, 1)
    if (!minDate || newDate >= startOfMonth(minDate)) {
      onChange(startOfMonth(newDate))
    }
  }

  const goToNextMonth = () => {
    const newDate = addMonths(value, 1)
    if (!maxDate || newDate <= startOfMonth(maxDate)) {
      onChange(startOfMonth(newDate))
    }
  }

  const canGoPrevious = !minDate || subMonths(value, 1) >= startOfMonth(minDate)
  const canGoNext = !maxDate || addMonths(value, 1) <= startOfMonth(maxDate)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Navegación rápida */}
      <Button
        variant="outline"
        size="sm"
        onClick={goToPreviousMonth}
        disabled={!canGoPrevious}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Selector de mes */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2 min-w-0"
          >
            <Calendar className="h-4 w-4" />
            <span className="font-medium">
              {format(value, 'MMMM yyyy', { locale: es })}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Card className="border-0 shadow-none">
            <CardContent className="p-4">
              {/* Selector de año */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleYearChange('prev')}
                  disabled={minDate && displayYear <= minDate.getFullYear()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="font-semibold text-lg">{displayYear}</span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleYearChange('next')}
                  disabled={maxDate && displayYear >= maxDate.getFullYear()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Grid de meses */}
              <div className="grid grid-cols-3 gap-2">
                {MESES.map((mes, index) => {
                  const isSelected = displayYear === currentYear && index === currentMonth
                  const isDisabled = isMonthDisabled(index)
                  const isCurrentMonth = 
                    displayYear === new Date().getFullYear() && 
                    index === new Date().getMonth()

                  return (
                    <Button
                      key={mes}
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleMonthSelect(index)}
                      disabled={isDisabled}
                      className={`h-8 text-xs relative ${
                        isCurrentMonth && !isSelected ? 'ring-1 ring-blue-500' : ''
                      }`}
                    >
                      {mes.substring(0, 3)}
                      {isCurrentMonth && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </Button>
                  )
                })}
              </div>

              {/* Botones de acción rápida */}
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    setDisplayYear(today.getFullYear())
                    handleMonthSelect(today.getMonth())
                  }}
                  className="flex-1 text-xs"
                >
                  Mes actual
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const lastMonth = subMonths(new Date(), 1)
                    setDisplayYear(lastMonth.getFullYear())
                    handleMonthSelect(lastMonth.getMonth())
                  }}
                  className="flex-1 text-xs"
                  disabled={minDate && subMonths(new Date(), 1) < startOfMonth(minDate)}
                >
                  Mes anterior
                </Button>
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>

      {/* Navegación rápida */}
      <Button
        variant="outline"
        size="sm"
        onClick={goToNextMonth}
        disabled={!canGoNext}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}