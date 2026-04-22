import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerButtonProps {
  value: string
  onChange: (v: string) => void
  min?: string
  placeholder?: string
}

export function DatePickerButton({ value, onChange, min, placeholder = 'Seleccionar' }: DatePickerButtonProps) {
  const [open, setOpen] = useState(false)
  const label = value
    ? format(parseISO(value), 'd MMM yyyy', { locale: es })
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-normal min-w-[120px] justify-start">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <input
          type="date"
          value={value}
          min={min}
          onChange={e => { onChange(e.target.value); if (e.target.value) setOpen(false) }}
          className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

interface MonthPickerButtonProps {
  value: string
  onChange: (v: string) => void
  min?: string
  placeholder?: string
}

export function MonthPickerButton({ value, onChange, min, placeholder = 'Seleccionar' }: MonthPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const label = value
    ? format(parseISO(value + '-01'), 'MMM yyyy', { locale: es })
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-normal min-w-[110px] justify-start capitalize">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <input
          type="month"
          value={value}
          min={min}
          onChange={e => { onChange(e.target.value); if (e.target.value) setOpen(false) }}
          className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
