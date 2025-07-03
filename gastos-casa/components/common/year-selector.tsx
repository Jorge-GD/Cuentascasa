'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface YearSelectorProps {
  value: number
  onChange: (year: number) => void
  minYear?: number
  maxYear?: number
  className?: string
}

export function YearSelector({ 
  value, 
  onChange, 
  minYear = 2000, 
  maxYear = new Date().getFullYear() + 5,
  className 
}: YearSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [displayDecade, setDisplayDecade] = useState(Math.floor(value / 10) * 10)

  const currentYear = new Date().getFullYear()

  const handleYearSelect = (year: number) => {
    onChange(year)
    setIsOpen(false)
  }

  const handleDecadeChange = (direction: 'prev' | 'next') => {
    const newDecade = direction === 'prev' ? displayDecade - 10 : displayDecade + 10
    setDisplayDecade(newDecade)
  }

  const goToPreviousYear = () => {
    const newYear = value - 1
    if (newYear >= minYear) {
      onChange(newYear)
    }
  }

  const goToNextYear = () => {
    const newYear = value + 1
    if (newYear <= maxYear) {
      onChange(newYear)
    }
  }

  const canGoPrevious = value > minYear
  const canGoNext = value < maxYear

  // Generar años de la década actual
  const years = []
  for (let i = 0; i < 10; i++) {
    const year = displayDecade + i
    if (year >= minYear && year <= maxYear) {
      years.push(year)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Navegación rápida */}
      <Button
        variant="outline"
        size="sm"
        onClick={goToPreviousYear}
        disabled={!canGoPrevious}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Selector de año */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2 min-w-0"
          >
            <Calendar className="h-4 w-4" />
            <span className="font-medium">{value}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Card className="border-0 shadow-none">
            <CardContent className="p-4">
              {/* Selector de década */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDecadeChange('prev')}
                  disabled={displayDecade - 10 < Math.floor(minYear / 10) * 10}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="font-semibold text-lg">
                  {displayDecade}-{displayDecade + 9}
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDecadeChange('next')}
                  disabled={displayDecade + 10 > Math.floor(maxYear / 10) * 10}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Grid de años */}
              <div className="grid grid-cols-2 gap-2">
                {years.map((year) => {
                  const isSelected = year === value
                  const isCurrentYear = year === currentYear

                  return (
                    <Button
                      key={year}
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleYearSelect(year)}
                      className={`h-8 text-xs relative ${
                        isCurrentYear && !isSelected ? 'ring-1 ring-blue-500' : ''
                      }`}
                    >
                      {year}
                      {isCurrentYear && (
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
                  onClick={() => handleYearSelect(currentYear)}
                  className="flex-1 text-xs"
                >
                  Año actual
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleYearSelect(currentYear - 1)}
                  className="flex-1 text-xs"
                  disabled={currentYear - 1 < minYear}
                >
                  Año anterior
                </Button>
              </div>

              {/* Información adicional */}
              <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Rango disponible:</span>
                  <span>{minYear} - {maxYear}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>

      {/* Navegación rápida */}
      <Button
        variant="outline"
        size="sm"
        onClick={goToNextYear}
        disabled={!canGoNext}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}