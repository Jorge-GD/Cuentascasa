'use client'

import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface FadeInProps {
  children: React.ReactNode
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  distance?: number
  duration?: number
  className?: string
  once?: boolean
}

export function FadeIn({
  children,
  delay = 0,
  direction = 'up',
  distance = 24,
  duration = 600,
  className,
  once = true
}: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!once || !hasAnimated)) {
          setTimeout(() => {
            setIsVisible(true)
            if (once) setHasAnimated(true)
          }, delay)
        } else if (!once && !entry.isIntersecting) {
          setIsVisible(false)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [delay, once, hasAnimated])

  const getTransform = () => {
    if (isVisible) return 'translate3d(0, 0, 0)'
    
    switch (direction) {
      case 'up':
        return `translate3d(0, ${distance}px, 0)`
      case 'down':
        return `translate3d(0, -${distance}px, 0)`
      case 'left':
        return `translate3d(${distance}px, 0, 0)`
      case 'right':
        return `translate3d(-${distance}px, 0, 0)`
      default:
        return 'translate3d(0, 0, 0)'
    }
  }

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transition: `all ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
        willChange: 'transform, opacity'
      }}
    >
      {children}
    </div>
  )
}

// Preset components for common use cases
export function FadeInUp({ children, ...props }: Omit<FadeInProps, 'direction'>) {
  return <FadeIn direction="up" {...props}>{children}</FadeIn>
}

export function FadeInDown({ children, ...props }: Omit<FadeInProps, 'direction'>) {
  return <FadeIn direction="down" {...props}>{children}</FadeIn>
}

export function FadeInLeft({ children, ...props }: Omit<FadeInProps, 'direction'>) {
  return <FadeIn direction="left" {...props}>{children}</FadeIn>
}

export function FadeInRight({ children, ...props }: Omit<FadeInProps, 'direction'>) {
  return <FadeIn direction="right" {...props}>{children}</FadeIn>
}