import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ImagePlus, Loader2 } from 'lucide-react'

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onScan: (code: string) => void
}

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Reset state and open file picker when dialog opens
  useEffect(() => {
    if (open) {
      setError(null)
      setIsProcessing(false)
      // Trigger file picker automatically
      setTimeout(() => fileInputRef.current?.click(), 200)
    }
  }, [open])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setIsProcessing(true)

    try {
      const scanner = new Html5Qrcode('barcode-image-scanner')
      const decodedText = await scanner.scanFile(file, true)
      const cleanCode = decodedText.replace(/\s+/g, '').replace(/[^0-9]/g, '')

      if (cleanCode) {
        onScan(cleanCode)
        onClose()
      } else {
        setError('No se pudo extraer un codigo numerico de la imagen.')
      }

      scanner.clear()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[BarcodeScanner] Image scan error:', message)
      setError('No se detecto un codigo de barras en la imagen. Intenta con otra foto mas nitida.')
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Escanear codigo de barras</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4">
          {/* Hidden element for scanFile */}
          <div id="barcode-image-scanner" className="hidden" />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          {isProcessing && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Procesando imagen...</span>
            </div>
          )}

          {error && (
            <div className="py-6 text-center">
              <p className="text-sm text-destructive mb-4">{error}</p>
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Otra imagen
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}

          {!isProcessing && !error && (
            <div className="text-center py-6">
              <ImagePlus className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Selecciona una foto del codigo de barras
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                Seleccionar imagen
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
