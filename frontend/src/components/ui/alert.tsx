import { Fragment } from 'react'
import { Transition } from '@headlessui/react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  onClose?: () => void
  className?: string
}

const alertStyles = {
  success: {
    container: 'bg-success-50 border-success-200',
    icon: 'text-success-400',
    title: 'text-success-800',
    message: 'text-success-700',
    closeButton: 'text-success-500 hover:text-success-600',
    Icon: CheckCircle,
  },
  error: {
    container: 'bg-danger-50 border-danger-200',
    icon: 'text-danger-400',
    title: 'text-danger-800',
    message: 'text-danger-700',
    closeButton: 'text-danger-500 hover:text-danger-600',
    Icon: XCircle,
  },
  warning: {
    container: 'bg-warning-50 border-warning-200',
    icon: 'text-warning-400',
    title: 'text-warning-800',
    message: 'text-warning-700',
    closeButton: 'text-warning-500 hover:text-warning-600',
    Icon: AlertTriangle,
  },
  info: {
    container: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-400',
    title: 'text-blue-800',
    message: 'text-blue-700',
    closeButton: 'text-blue-500 hover:text-blue-600',
    Icon: Info,
  },
}

export function Alert({ type, title, message, onClose, className }: AlertProps) {
  const styles = alertStyles[type]
  const { Icon } = styles

  return (
    <div className={cn('rounded-md border p-4', styles.container, className)}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn('h-5 w-5', styles.icon)} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={cn('text-sm font-medium', styles.title)}>
              {title}
            </h3>
          )}
          <div className={cn('text-sm', title ? 'mt-2' : '', styles.message)}>
            <p>{message}</p>
          </div>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className={cn(
                  'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  styles.closeButton
                )}
                onClick={onClose}
              >
                <span className="sr-only">Dismiss</span>
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface ToastProps {
  show: boolean
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  onClose: () => void
  duration?: number
}

export function Toast({ show, type, title, message, onClose, duration = 5000 }: ToastProps) {
  // Auto-close after duration
  if (show && duration > 0) {
    setTimeout(() => {
      onClose()
    }, duration)
  }

  return (
    <Transition
      show={show}
      as={Fragment}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enterTo="translate-y-0 opacity-100 sm:translate-x-0"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="fixed top-4 right-4 z-50 w-full max-w-sm">
        <Alert
          type={type}
          title={title}
          message={message}
          onClose={onClose}
          className="shadow-lg"
        />
      </div>
    </Transition>
  )
}
