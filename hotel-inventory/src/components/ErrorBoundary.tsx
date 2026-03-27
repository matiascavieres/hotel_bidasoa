import React from 'react'
import { RefreshCw } from 'lucide-react'

interface State {
  hasError: boolean
  isDomError: boolean
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, isDomError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    const isDomError =
      error instanceof DOMException ||
      error.name === 'NotFoundError' ||
      error.message?.includes('removeChild') ||
      error.message?.includes('insertBefore')
    return { hasError: true, isDomError }
  }

  componentDidCatch(error: Error) {
    console.warn('[ErrorBoundary] Caught:', error.name, error.message)
    // DOM errors caused by browser extensions (Translate, Grammarly, etc.) — auto-recover
    if (
      error instanceof DOMException ||
      error.name === 'NotFoundError' ||
      error.message?.includes('removeChild') ||
      error.message?.includes('insertBefore')
    ) {
      setTimeout(() => this.setState({ hasError: false, isDomError: false }), 200)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isDomError) {
        return (
          <div className="fixed inset-0 flex items-center justify-center bg-background">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )
      }
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4">
          <p className="text-muted-foreground">Ocurrió un error inesperado</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          >
            Recargar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
