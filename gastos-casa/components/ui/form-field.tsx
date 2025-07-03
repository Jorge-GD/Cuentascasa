'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface BaseFieldProps {
  label?: string
  description?: string
  required?: boolean
  error?: string
  isValidating?: boolean
  className?: string
  children?: React.ReactNode
}

interface InputFieldProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
}

interface TextareaFieldProps extends BaseFieldProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  rows?: number
}

interface SelectFieldProps extends BaseFieldProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  options: Array<{ value: string; label: string; disabled?: boolean }>
  disabled?: boolean
}

interface CheckboxFieldProps extends BaseFieldProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
}

// Base field wrapper component
export function FormField({ 
  label, 
  description, 
  required, 
  error, 
  isValidating, 
  className,
  children 
}: BaseFieldProps) {
  const fieldId = React.useId()
  const hasError = !!error
  const isValid = !hasError && !isValidating

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label 
          htmlFor={fieldId}
          className={cn(
            'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
            hasError && 'text-destructive',
            required && "after:content-['*'] after:ml-0.5 after:text-destructive"
          )}
        >
          {label}
        </Label>
      )}
      
      <div className="relative">
        {React.Children.map(children, child =>
          React.isValidElement(child)
            ? React.cloneElement(child, { 
                id: fieldId,
                'aria-invalid': hasError,
                'aria-describedby': error ? `${fieldId}-error` : description ? `${fieldId}-desc` : undefined
              })
            : child
        )}
        
        {/* Validation icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {isValidating && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {isValid && !isValidating && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          {hasError && !isValidating && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>

      {description && !error && (
        <p id={`${fieldId}-desc`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {error && (
        <p 
          id={`${fieldId}-error`} 
          className="text-sm text-destructive flex items-center gap-1"
        >
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  )
}

// Input field component
export function InputField({
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  disabled,
  ...fieldProps
}: InputFieldProps) {
  return (
    <FormField {...fieldProps}>
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={cn(
          fieldProps.error && 'border-destructive focus-visible:ring-destructive',
          !fieldProps.error && !fieldProps.isValidating && value && 'border-green-500'
        )}
      />
    </FormField>
  )
}

// Textarea field component
export function TextareaField({
  placeholder,
  value,
  onChange,
  onBlur,
  disabled,
  rows = 3,
  ...fieldProps
}: TextareaFieldProps) {
  return (
    <FormField {...fieldProps}>
      <Textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        rows={rows}
        className={cn(
          fieldProps.error && 'border-destructive focus-visible:ring-destructive',
          !fieldProps.error && !fieldProps.isValidating && value && 'border-green-500'
        )}
      />
    </FormField>
  )
}

// Select field component
export function SelectField({
  placeholder,
  value,
  onChange,
  options,
  disabled,
  ...fieldProps
}: SelectFieldProps) {
  return (
    <FormField {...fieldProps}>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            fieldProps.error && 'border-destructive focus:ring-destructive',
            !fieldProps.error && !fieldProps.isValidating && value && 'border-green-500'
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}

// Checkbox field component
export function CheckboxField({
  checked,
  onChange,
  disabled,
  ...fieldProps
}: CheckboxFieldProps) {
  return (
    <FormField {...fieldProps} className={cn('flex flex-row items-start space-x-3 space-y-0', fieldProps.className)}>
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={cn(
          fieldProps.error && 'border-destructive data-[state=checked]:bg-destructive'
        )}
      />
      <div className="space-y-1 leading-none">
        {fieldProps.label && (
          <Label className={cn(
            'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
            fieldProps.error && 'text-destructive'
          )}>
            {fieldProps.label}
            {fieldProps.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        )}
        {fieldProps.description && (
          <p className="text-sm text-muted-foreground">
            {fieldProps.description}
          </p>
        )}
        {fieldProps.error && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {fieldProps.error}
          </p>
        )}
      </div>
    </FormField>
  )
}

// Currency input field
export function CurrencyField({
  value,
  onChange,
  currency = 'EUR',
  ...props
}: Omit<InputFieldProps, 'type'> & { currency?: string }) {
  const handleChange = (val: string) => {
    // Remove non-numeric characters except decimal point and minus
    const cleanValue = val.replace(/[^0-9.-]/g, '')
    onChange?.(cleanValue)
  }

  const formatValue = (val: string) => {
    if (!val) return ''
    const num = parseFloat(val)
    if (isNaN(num)) return val
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency
    }).format(num)
  }

  return (
    <InputField
      {...props}
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={`0,00 ${currency}`}
    />
  )
}