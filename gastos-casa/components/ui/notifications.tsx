'use client'

import { useState, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bell,
  BellOff,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  Settings,
  Trash2
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  timestamp: Date
  read: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    case 'error':
      return <X className="h-4 w-4 text-red-500" />
    default:
      return <Info className="h-4 w-4 text-blue-500" />
  }
}

interface NotificationsProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

export function Notifications({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll
}: NotificationsProps) {
  const unreadCount = notifications.filter(n => !n.read).length
  const [isOpen, setIsOpen] = useState(false)

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
    if (notification.action) {
      notification.action.onClick()
      setIsOpen(false)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              className="text-xs h-6"
            >
              Marcar todas como leídas
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <BellOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No tienes notificaciones
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  onDelete={() => onDelete(notification.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onClearAll}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar todas
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings className="h-4 w-4 mr-2" />
          Configuración de notificaciones
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface NotificationItemProps {
  notification: Notification
  onClick: () => void
  onDelete: () => void
}

function NotificationItem({ notification, onClick, onDelete }: NotificationItemProps) {
  return (
    <div
      className={cn(
        "group relative p-3 cursor-pointer hover:bg-muted/50 border-l-2 transition-colors",
        notification.read ? "border-l-transparent" : "border-l-primary bg-primary/5"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className={cn(
                "text-sm font-medium truncate",
                !notification.read && "font-semibold"
              )}>
                {notification.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {notification.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(notification.timestamp, { 
                  addSuffix: true, 
                  locale: es 
                })}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          {notification.action && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-6 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                notification.action!.onClick()
              }}
            >
              {notification.action.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Hook for managing notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false
    }
    setNotifications(prev => [newNotification, ...prev])
  }

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    )
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('gastos-casa-notifications')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setNotifications(parsed.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp)
          })))
        } catch (error) {
          console.error('Error loading notifications:', error)
        }
      }
    }
  }, [])

  // Save notifications to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gastos-casa-notifications', JSON.stringify(notifications))
    }
  }, [notifications])

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  }
}