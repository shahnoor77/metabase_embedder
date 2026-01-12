import { useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { workspaceAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function MetabaseOpener({ workspace, buttonText = "Open in Metabase", className = "" }) {
  const [loading, setLoading] = useState(false)

  const handleOpen = async () => {
    if (!workspace?.id) {
      return toast.error("Invalid workspace selection");
    }

    setLoading(true)
    try {
      // We call the backend to get the specific redirect or dashboard URL for this workspace
      // Using the workspaceAPI we established in api.js
      const response = await workspaceAPI.getEmbedUrl(workspace.id)

      // Backend returns embed URL under `url`
      const metabaseUrl = response.data.url || response.data.external_link;

      if (metabaseUrl) {
        toast.success('Redirecting to Metabase...')
        window.open(metabaseUrl, '_blank', 'noopener,noreferrer')
      } else {
        toast.error('Metabase URL not configured for this workspace')
      }
    } catch (error) {
      console.error('Metabase Opener Error:', error)
      toast.error('Failed to connect to Metabase')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleOpen}
      disabled={loading}
      className={`flex items-center justify-center font-semibold transition-all ${className} ${
        loading ? 'opacity-70 cursor-not-allowed' : ''
      }`}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <ExternalLink className="w-5 h-5 mr-2" />
          <span>{buttonText}</span>
        </>
      )}
    </motion.button>
  )
}