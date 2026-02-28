import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onScan: (code: string) => void
}

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const containerId = 'barcode-scanner-container'

  useEffect(() => {
    if (!open) return

    let mounted = true
    setError(null)
    setIsStarting(true)

    // Small delay to ensure the DOM element is rendered
    const timer = setTimeout(async () => {
      if (!mounted) return

      try {
        const scanner = new Html5Qrcode(containerId)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 150 },
            aspectRatio: 1.5,
          },
          (decodedText) => {
            // Clean the barcode: remove spaces, keep only digits
            const cleanCode = decodedText.replace(/\s+/g, '').replace(/[^0-9]/g, '')
            if (cleanCode) {
              onScan(cleanCode)
              handleClose()
            }
          },
          () => {
            // Ignore scan failures (no code found yet)
          }
        )

        if (mounted) {
          setIsStarting(false)
        }
      } catch (err) {
        if (mounted) {
          setIsStarting(false)
          const message = err instanceof Error ? err.message : String(err)
          if (message.includes('Permission') || message.includes('NotAllowed')) {
            setError('Permiso de camara denegado. Habilita el acceso a la camara en tu navegador.')
          } else if (message.includes('NotFound') || message.includes('Requested device not found')) {
            setError('No se encontro una camara disponible.')
          } else {
            setError(`Error al iniciar la camara: ${message}`)
          }
        }
      }
    }, 300)

    return () => {
      mounted = false
      clearTimeout(timer)
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current?.clear()
          scannerRef.current = null
        })
      }
    }
  }, [open])

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {}).finally(() => {
        scannerRef.current?.clear()
        scannerRef.current = null
        onClose()
      })
    } else {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Escanear codigo de barras</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4">
          {isStarting && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Iniciando camara...</span>
            </div>
          )}

          {error && (
            <div className="py-8 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          )}

          <div
            id={containerId}
            className={`w-full rounded-lg overflow-hidden ${isStarting || error ? 'h-0' : ''}`}
          />

          {!isStarting && !error && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Apunta la camara al codigo de barras del producto
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
