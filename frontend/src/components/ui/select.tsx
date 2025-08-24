import { forwardRef, SelectHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  placeholder?: string
  onValueChange?: (value: string) => void
}

export interface SelectContentProps {
  children: ReactNode
}

export interface SelectItemProps {
  value: string
  children: ReactNode
}

export interface SelectTriggerProps {
  children: ReactNode
  className?: string
}

export interface SelectValueProps {
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, placeholder, children, onValueChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) onChange(e)
      if (onValueChange) onValueChange(e.target.value)
    }

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            className={cn(
              'flex h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500',
              className
            )}
            ref={ref}
            onChange={handleChange}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {children}
          </select>
          <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        {hint && !error && (
          <p className="text-sm text-gray-500">{hint}</p>
        )}
        {error && (
          <p className="text-sm text-danger-600">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

// Compatibility components for shadcn/ui-style API
const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
  ({ children }, ref) => (
    <div ref={ref}>{children}</div>
  )
)

const SelectItem = forwardRef<HTMLOptionElement, SelectItemProps>(
  ({ value, children }, ref) => (
    <option ref={ref} value={value}>{children}</option>
  )
)

const SelectTrigger = forwardRef<HTMLSelectElement, SelectTriggerProps>(
  ({ children, className }, ref) => (
    <Select ref={ref} className={className}>{children}</Select>
  )
)

const SelectValue = ({ placeholder }: SelectValueProps) => (
  <span>{placeholder}</span>
)

SelectContent.displayName = 'SelectContent'
SelectItem.displayName = 'SelectItem'
SelectTrigger.displayName = 'SelectTrigger'
SelectValue.displayName = 'SelectValue'

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
