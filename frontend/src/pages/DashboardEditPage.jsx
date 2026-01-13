import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'
import Loading from '../components/Common/Loading'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function DashboardEditPage() {
  const { dashboardId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [editorUrl, setEditorUrl] = useState(null)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    loadEditor()
  }, [dashboardId])

  const loadEditor = async () => {
    try {
      setLoading(true)
      
      const token = localStorage.getItem('access_token')
      
      // Get editor URL
      const response = await axios.get(
        `${API_BASE_URL}/api/dashboards/${dashboardId}/embed`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // Transform internal Metabase URL to public URL
      let publicEditorUrl = response.data.editor_url
      if (publicEditorUrl.includes('metabase:3000')) {
        publicEditorUrl = publicEditorUrl.replace('metabase:3000', 'localhost:3000')
      }
      
      setEditorUrl(publicEditorUrl)
      
    } catch (error) {
      console.error('Failed to load editor:', error)
      toast.error('Failed to load dashboard editor')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    try {
      setPublishing(true)
      const token = localStorage.getItem('access_token')
      
      await axios.post(
        `${API_BASE_URL}/api/dashboards/${dashboardId}/publish`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      toast.success('Dashboard published successfully!')
      setTimeout(() => {
        navigate('/dashboards')
      }, 1500)
      
    } catch (error) {
      toast.error('Failed to publish dashboard')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return <Loading fullScreen={false} />
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboards')}
          className="flex items-center space-x-2 text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboards</span>
        </button>

        <button
          onClick={handlePublish}
          disabled={publishing}
          className="btn-primary inline-flex items-center space-x-2"
        >
          {publishing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Publishing...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Publish & Save</span>
            </>
          )}
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Dashboard Editor:</strong> Make changes to your dashboard. Click "Publish & Save" when done.
        </p>
      </div>

      {/* Editor */}
      {editorUrl && (
        <div className="flex-1 rounded-xl overflow-hidden border border-gray-200">
          <iframe
            src={editorUrl}
            frameBorder="0"
            width="100%"
            height="100%"
            allowTransparency
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title="Dashboard Editor"
            className="w-full"
            style={{ minHeight: '600px' }}
          />
        </div>
      )}
    </div>
  )
}
