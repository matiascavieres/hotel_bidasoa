import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InboundList } from '@/components/inbound/InboundList'
import { InboundDetail } from '@/components/inbound/InboundDetail'
import { useInbounds } from '@/hooks/useInbounds'
import type { Inbound as InboundType } from '@/types'

export default function Inbound() {
  const { data: inbounds, isLoading, error } = useInbounds()
  const [selectedInbound, setSelectedInbound] = useState<InboundType | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inbound</h1>
          <p className="text-muted-foreground">
            Registro de ingresos de productos desde proveedores
          </p>
        </div>
        <Link to="/inbound/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Ingreso
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="py-8 text-center text-destructive">
          Error al cargar ingresos: {error.message}
        </div>
      )}

      {!isLoading && !error && (
        <InboundList
          inbounds={(inbounds as InboundType[]) || []}
          onSelect={setSelectedInbound}
        />
      )}

      {selectedInbound && (
        <InboundDetail
          inboundId={selectedInbound.id}
          open={!!selectedInbound}
          onClose={() => setSelectedInbound(null)}
        />
      )}
    </div>
  )
}
