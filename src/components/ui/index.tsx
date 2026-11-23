import React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Button
// ============================================================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => {
    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-[#9B7BC7] hover:bg-[#8663B8] text-white shadow-sm shadow-[#9B7BC7]/25 active:scale-[0.98]',
      secondary:
        'bg-[#EDE7F6] hover:bg-[#E1D7F2] text-[#5B3E8C] dark:bg-[#2E2644] dark:text-[#D9C9F2] dark:hover:bg-[#3A3056]',
      outline:
        'border border-[#E4DFF0] dark:border-[#322C45] bg-white dark:bg-[#1E1B29] hover:bg-[#F6F4FB] dark:hover:bg-[#282438] text-[#4B4D50] dark:text-[#EAE6F5]',
      ghost:
        'hover:bg-[#F0ECF9] dark:hover:bg-[#282438] text-[#4B4D50] dark:text-[#D4CEE5]',
      danger:
        'bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-500/20',
      success:
        'bg-[#6CC59A] hover:bg-[#55B386] text-white shadow-sm shadow-[#6CC59A]/25 active:scale-[0.98]',
    }
    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'h-9 px-3 text-xs rounded-xl gap-1.5',
      md: 'h-11 px-4 text-sm rounded-2xl gap-2',
      lg: 'h-12 px-6 text-base rounded-2xl gap-2',
      icon: 'h-10 w-10 rounded-xl p-0 justify-center',
    }
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

// ============================================================================
// Card
// ============================================================================
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-[#1E1B29] rounded-[20px] border border-[#ECE8F6] dark:border-[#2E2940] shadow-[0_6px_24px_-12px_rgba(75,77,80,0.12)] dark:shadow-none',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================================================
// Input / Textarea / Select / Label
// ============================================================================
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full min-w-0 max-w-full h-11 px-3.5 rounded-2xl border border-[#E4DFF0] dark:border-[#342E49] bg-white dark:bg-[#161320] text-base sm:text-sm text-[#3A3C3F] dark:text-[#F3F1F9] placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9B7BC7]/40 focus:border-[#9B7BC7] transition',
      className
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full min-h-[84px] p-3.5 rounded-2xl border border-[#E4DFF0] dark:border-[#342E49] bg-white dark:bg-[#161320] text-base sm:text-sm text-[#3A3C3F] dark:text-[#F3F1F9] placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9B7BC7]/40 focus:border-[#9B7BC7] transition resize-y',
      className
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'w-full min-w-0 max-w-full h-11 px-3.5 rounded-2xl border border-[#E4DFF0] dark:border-[#342E49] bg-white dark:bg-[#161320] text-base sm:text-sm text-[#3A3C3F] dark:text-[#F3F1F9] focus:outline-none focus:ring-2 focus:ring-[#9B7BC7]/40 focus:border-[#9B7BC7] transition',
      className
    )}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = 'Select'

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'block text-xs font-semibold text-[#4B4D50] dark:text-[#CBC5DD] mb-1.5',
        className
      )}
      {...props}
    >
      {children}
    </label>
  )
}

// ============================================================================
// Badge
// ============================================================================
export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'purple'
  className?: string
}) {
  const styles = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    success: 'bg-[#E6F7EF] text-[#287D56] dark:bg-[#1C3B2D] dark:text-[#7AD5AA]',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    purple: 'bg-[#EDE7F6] text-[#6B4BA1] dark:bg-[#2F2447] dark:text-[#C9B3EE]',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

// ============================================================================
// Switch
// ============================================================================
export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="inline-flex items-center gap-2.5 cursor-pointer select-none"
    >
      <span
        className={cn(
          'w-11 h-6 rounded-full p-0.5 transition-colors flex items-center',
          checked ? 'bg-[#9B7BC7]' : 'bg-gray-300 dark:bg-gray-700'
        )}
      >
        <span
          className={cn(
            'w-5 h-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </span>
      {label && <span className="text-sm font-medium text-[#4B4D50] dark:text-[#EAE6F5]">{label}</span>}
    </button>
  )
}

// ============================================================================
// Modal / Dialog
// ============================================================================
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-xl',
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  maxWidth?: string
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[2px] p-0 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={cn(
          'w-full bg-white dark:bg-[#1E1B29] rounded-t-[24px] sm:rounded-[24px] shadow-2xl border border-[#ECE8F6] dark:border-[#2E2940] max-h-[92dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150',
          maxWidth
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#F0ECF8] dark:border-[#2E2940]">
          <div>
            <h2 className="text-lg font-bold text-[#3A3C3F] dark:text-white">{title}</h2>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2B263C] text-gray-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

// ============================================================================
// Skeleton & EmptyState
// ============================================================================
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-2xl bg-[#EAE5F5] dark:bg-[#2B263C]',
        className
      )}
    />
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="w-14 h-14 rounded-2xl bg-[#EDE7F6] dark:bg-[#2B2440] text-[#9B7BC7] flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="text-base font-bold text-[#3A3C3F] dark:text-white">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
