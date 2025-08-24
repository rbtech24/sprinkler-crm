import { cn } from '@/lib/utils'

interface TableProps {
  children: React.ReactNode
  className?: string
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)}>
        {children}
      </table>
    </div>
  )
}

interface TableHeaderProps {
  children: React.ReactNode
  className?: string
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return (
    <thead className={cn('[&_tr]:border-b', className)}>
      {children}
    </thead>
  )
}

interface TableBodyProps {
  children: React.ReactNode
  className?: string
}

export function TableBody({ children, className }: TableBodyProps) {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)}>
      {children}
    </tbody>
  )
}

interface TableRowProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function TableRow({ children, className, onClick }: TableRowProps) {
  return (
    <tr 
      className={cn(
        'border-b border-gray-200 transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-gray-50',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

interface TableHeadProps {
  children: React.ReactNode
  className?: string
}

export function TableHead({ children, className }: TableHeadProps) {
  return (
    <th className={cn('h-12 px-4 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0', className)}>
      {children}
    </th>
  )
}

interface TableCellProps {
  children: React.ReactNode
  className?: string
}

export function TableCell({ children, className }: TableCellProps) {
  return (
    <td className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}>
      {children}
    </td>
  )
}
