"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Trash2 } from "lucide-react"

interface ConfirmDialogProps {
  children: React.ReactNode
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  onConfirm: () => void | Promise<void>
  disabled?: boolean
}

export function ConfirmDialog({
  children,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  onConfirm,
  disabled = false,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      setIsOpen(false)
    } catch (error) {
      console.error("Error in confirm action:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild disabled={disabled}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {variant === "destructive" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              variant === "destructive"
                ? "bg-red-600 hover:bg-red-700 dark:bg-red-900 dark:hover:bg-red-800"
                : undefined
            }
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                {confirmText}
              </div>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Componente específico para eliminaciones
interface DeleteConfirmDialogProps {
  children: React.ReactNode
  itemName: string
  itemType?: string
  onConfirm: () => void | Promise<void>
  disabled?: boolean
}

export function DeleteConfirmDialog({
  children,
  itemName,
  itemType = "elemento",
  onConfirm,
  disabled = false,
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      title={`Eliminar ${itemType}`}
      description={`¿Estás seguro de que quieres eliminar "${itemName}"? Esta acción no se puede deshacer.`}
      confirmText="Eliminar"
      cancelText="Cancelar"
      variant="destructive"
      onConfirm={onConfirm}
      disabled={disabled}
    >
      {children}
    </ConfirmDialog>
  )
}