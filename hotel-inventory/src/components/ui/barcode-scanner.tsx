import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Camera, ImagePlus, Loader2 } from 'lucide-react'

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onScan: (code: string) => void
}

type ScanMode = 'choose' | 'camera' | 'image'

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mode, setMode] = useState<ScanMode>('choose')
  const containerId = 'barcode-scanner-container'

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setMode('choose')
      setError(null)
      setIsStarting(false)
      setIsProcessing(false)
    }
  }, [open])

  // Camera mode
  useEffect(() => {
    if (!open || mode !== 'camera') return

    let mounted = true
    setError(null)
    setIsStarting(true)

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
  }, [open, mode])

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
        handleClose()
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
      // Reset file input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleBack = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {}).finally(() => {
        scannerRef.current?.clear()
        scannerRef.current = null
        setMode('choose')
        setError(null)
      })
    } else {
      setMode('choose')
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Escanear codigo de barras</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4">
          {/* Mode selection */}
          {mode === 'choose' && (
            <div className="space-y-3 py-4">
              <p className="text-sm text-center text-muted-foreground mb-4">
                Selecciona como quieres escanear el codigo
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setMode('camera')}
                >
                  <Camera className="h-8 w-8" />
                  <span className="text-xs">Camara en vivo</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => {
                    setMode('image')
                    // Trigger file picker right away
                    setTimeout(() => fileInputRef.current?.click(), 100)
                  }}
                >
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-xs">Subir imagen</span>
                </Button>
              </div>
            </div>
          )}

          {/* Camera mode */}
          {mode === 'camera' && (
            <>
              {isStarting && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Iniciando camara...</span>
                </div>
              )}

              {error && (
                <div className="py-8 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <div className="flex justify-center gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={handleBack}>
                      Volver
                    </Button>
                  </div>
                </div>
              )}

              <div
                id={containerId}
                className={`w-full rounded-lg overflow-hidden ${isStarting || error ? 'h-0' : ''}`}
              />

              {!isStarting && !error && (
                <>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Apunta la camara al codigo de barras del producto
                  </p>
                  <div className="flex justify-center mt-3">
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      Volver
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Image mode */}
          {mode === 'image' && (
            <div className="py-4">
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
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      Volver
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
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="mr-2 h-4 w-4" />
                      Seleccionar imagen
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      Volver
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
