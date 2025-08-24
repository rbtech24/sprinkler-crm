import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <Loader2 className={cn('animate-spin text-gray-500', sizes[size], className)} />
  )
}

interface LoadingOverlayProps {
  message?: string
  className?: string
}

export function LoadingOverlay({ message = 'Loading...', className }: LoadingOverlayProps) {
  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-75', className)}>
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  )
}

interface LoadingCardProps {
  message?: string
  className?: string
}

export function LoadingCard({ message = 'Loading...', className }: LoadingCardProps) {
  return (
    <div className={cn('flex items-center justify-center p-8 bg-gray-50 rounded-lg', className)}>
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  )
}
