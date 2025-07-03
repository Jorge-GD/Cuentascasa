'use client'

import { motion, AnimatePresence, Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

// Animation variants
export const animations = {
  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  } as Variants,

  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  } as Variants,

  fadeInDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 }
  } as Variants,

  // Slide animations
  slideInLeft: {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  } as Variants,

  slideInRight: {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 50 }
  } as Variants,

  // Scale animations
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 }
  } as Variants,

  scaleInSpring: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    },
    exit: { opacity: 0, scale: 0.8 }
  } as Variants,

  // Rotation animations
  rotateIn: {
    initial: { opacity: 0, rotate: -180 },
    animate: { opacity: 1, rotate: 0 },
    exit: { opacity: 0, rotate: 180 }
  } as Variants,

  // List animations
  staggerContainer: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  } as Variants,

  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  } as Variants,

  // Notification animations
  notification: {
    initial: { opacity: 0, x: 300, scale: 0.8 },
    animate: { 
      opacity: 1, 
      x: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    exit: { 
      opacity: 0, 
      x: 300, 
      scale: 0.8,
      transition: {
        duration: 0.2
      }
    }
  } as Variants,

  // Modal animations
  modal: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  } as Variants,

  modalContent: {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      y: 20,
      transition: {
        duration: 0.2
      }
    }
  } as Variants
}

// Reusable animated components
interface AnimatedDivProps {
  children: React.ReactNode
  variant?: keyof typeof animations
  className?: string
  delay?: number
  duration?: number
  [key: string]: any
}

export function AnimatedDiv({ 
  children, 
  variant = 'fadeIn', 
  className, 
  delay = 0, 
  duration = 0.3,
  ...props 
}: AnimatedDivProps) {
  return (
    <motion.div
      className={className}
      variants={animations[variant]}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration,
        delay,
        ease: "easeOut"
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Staggered list animation
interface StaggeredListProps {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}

export function StaggeredList({ children, className, staggerDelay = 0.1 }: StaggeredListProps) {
  return (
    <motion.div
      className={className}
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  )
}

// Press animation for buttons
export function PressableDiv({ 
  children, 
  className, 
  onClick,
  disabled = false,
  ...props 
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  [key: string]: any
}) {
  return (
    <motion.div
      className={cn(className, disabled && 'pointer-events-none opacity-50')}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={disabled ? undefined : onClick}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Hover lift animation
export function HoverLift({ 
  children, 
  className,
  liftHeight = 4,
  ...props 
}: {
  children: React.ReactNode
  className?: string
  liftHeight?: number
  [key: string]: any
}) {
  return (
    <motion.div
      className={className}
      whileHover={{ 
        y: -liftHeight,
        transition: { type: "spring", stiffness: 400, damping: 25 }
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Shake animation for errors
export function ShakeDiv({ 
  children, 
  className, 
  trigger,
  ...props 
}: {
  children: React.ReactNode
  className?: string
  trigger?: boolean
  [key: string]: any
}) {
  return (
    <motion.div
      className={className}
      animate={trigger ? {
        x: [-2, 2, -2, 2, 0],
        transition: { duration: 0.4, ease: "easeInOut" }
      } : {}}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Pulse animation for loading states
export function PulseDiv({ 
  children, 
  className, 
  isActive = true,
  ...props 
}: {
  children: React.ReactNode
  className?: string
  isActive?: boolean
  [key: string]: any
}) {
  return (
    <motion.div
      className={className}
      animate={isActive ? {
        scale: [1, 1.05, 1],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      } : {}}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Page transition wrapper
export function PageTransition({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        className={className}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{
          duration: 0.3,
          ease: "easeInOut"
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Success checkmark animation
export function SuccessCheckmark({ size = 24, className }: { size?: number, className?: string }) {
  return (
    <motion.svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{
        pathLength: { duration: 0.5, ease: "easeInOut" },
        opacity: { duration: 0.2 }
      }}
    >
      <motion.path
        d="M20 6L9 17l-5-5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
    </motion.svg>
  )
}

// Loading dots animation
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex space-x-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-current rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}

// Card hover animation
export function AnimatedCard({ 
  children, 
  className,
  ...props 
}: {
  children: React.ReactNode
  className?: string
  [key: string]: any
}) {
  return (
    <motion.div
      className={className}
      whileHover={{
        y: -2,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      {...props}
    >
      {children}
    </motion.div>
  )
}