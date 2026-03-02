import { useState, useMemo } from 'react'
import { ChevronsUpDown, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface MultiSelectProps {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  countLabel?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  countLabel = 'seleccionados',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredOptions = useMemo(() => {
    if (!search) return options
    const lower = search.toLowerCase()
    return options.filter((opt) => opt.toLowerCase().includes(lower))
  }, [options, search])

  const toggleOption = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((s) => s !== option)
        : [...selected, option]
    )
  }

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([])
    } else {
      onChange([...options])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between font-normal h-8 text-xs', className)}
        >
          <span className="truncate">
            {selected.length === 0
              ? placeholder
              : selected.length === 1
                ? selected[0]
                : `${selected.length} ${countLabel}`}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        {options.length > 5 && (
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full rounded-md border border-input bg-background px-7 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch('')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
        <div className="px-2 py-1.5 border-b">
          <button
            className="text-xs text-primary hover:underline"
            onClick={handleSelectAll}
          >
            {selected.length === options.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </button>
        </div>
        <ScrollArea className="max-h-[250px] overflow-y-auto">
          <div className="p-1">
            {filteredOptions.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
              >
                <Checkbox
                  checked={selected.includes(option)}
                  onCheckedChange={() => toggleOption(option)}
                />
                <span className="truncate">{option}</span>
              </label>
            ))}
            {filteredOptions.length === 0 && (
              <p className="py-2 text-center text-sm text-muted-foreground">
                Sin resultados
              </p>
            )}
          </div>
        </ScrollArea>
        {selected.length > 0 && (
          <div className="border-t p-2 flex flex-wrap gap-1">
            {selected.slice(0, 3).map((s) => (
              <Badge key={s} variant="secondary" className="text-xs gap-1">
                {s}
                <button onClick={() => toggleOption(s)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selected.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{selected.length - 3} más
              </Badge>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
