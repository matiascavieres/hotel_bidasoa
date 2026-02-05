import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProductSearchProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCategory: string
  onCategoryChange: (category: string) => void
}

// Placeholder categories - will be replaced with real data
const categories = [
  { id: 'all', name: 'Todas las categorias' },
  { id: 'pisco', name: 'Pisco' },
  { id: 'ron', name: 'Ron' },
  { id: 'tequila', name: 'Tequila' },
  { id: 'whisky', name: 'Whisky' },
  { id: 'gin', name: 'Gin' },
  { id: 'vodka', name: 'Vodka' },
  { id: 'licores', name: 'Licores' },
  { id: 'cervezas', name: 'Cervezas' },
  { id: 'vinos', name: 'Vinos' },
  { id: 'bebidas', name: 'Bebidas' },
]

export function ProductSearch({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
}: ProductSearchProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar producto..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
