import { motion } from 'framer-motion'
import { X, Maximize2, Minimize2, Loader2, ExternalLink, ShieldAlert } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function WorkspaceViewer({ workspace, embedUrl, onClose }) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isIframeLoading, setIsIframeLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Sync state if user exits fullscreen via ESC key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Safety timeout: If iframe doesn't load in 10 seconds, show troubleshooting
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isIframeLoading) setHasError(true)
    }, 10000)
    return () => clearTimeout(timer)
  }, [isIframeLoading])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error attempting to enable full-screen mode: ${e.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  const handleOpenInNewTab = () => {
    if (embedUrl) {
      window.open(embedUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-4 md:inset-8 z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900 line-clamp-1">
              {workspace?.name || "Workspace"}
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Metabase Collection - Create and edit dashboards, charts, and questions
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenInNewTab}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              title="Open in new tab"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Iframe Viewport */}
        <div className="flex-1 bg-gray-50 relative">
          {isIframeLoading && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
              <p className="text-sm text-gray-600 animate-pulse font-medium">
                Loading Metabase workspace...
              </p>
            </div>
          )}

          {hasError && isIframeLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20 p-6 text-center">
              <ShieldAlert className="w-12 h-12 text-amber-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Having trouble loading?</h3>
              <p className="text-sm text-gray-600 max-w-md mt-2">
                This usually happens due to local network settings or if Metabase is not running at 
                <code className="bg-gray-100 px-1 mx-1">localhost:3000</code>.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 text-blue-600 font-semibold hover:underline"
              >
                Retry Connection
              </button>
            </div>
          )}
          
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              onLoad={() => {
                setIsIframeLoading(false);
                setHasError(false);
              }}
              // FIX: allowtransparency (all lowercase) for React
              allowtransparency="true"
              allowFullScreen
              title={`Metabase Workspace: ${workspace?.name}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center p-6">
              <div>
                <p className="text-gray-500 mb-1 font-medium">No embed URL found.</p>
                <p className="text-sm text-gray-400">
                  Please verify your backend is returning a valid <code className="text-xs">embed_url</code>.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}