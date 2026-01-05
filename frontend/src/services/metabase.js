import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const metabaseService = {
  getWorkspaceSession: async (workspaceId, token) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/metabase/session/${workspaceId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to get session',
      }
    }
  },

  getWorkspaceUrl: async (workspaceId, token) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/metabase/workspace/${workspaceId}/url`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to get URL',
      }
    }
  },

  openMetabaseWorkspace: async (workspaceId, token) => {
    const sessionResult = await metabaseService.getWorkspaceSession(workspaceId, token)
    
    if (sessionResult.success) {
      const { session_token, metabase_url, workspace_collection_id } = sessionResult.data
      
      // Open Metabase in a new window with the session
      const collectionUrl = `${metabase_url}/collection/${workspace_collection_id}`
      
      // Create a form to POST the session token
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = `${metabase_url}/auth/sso`
      form.target = '_blank'
      
      const tokenInput = document.createElement('input')
      tokenInput.type = 'hidden'
      tokenInput.name = 'token'
      tokenInput.value = session_token
      
      form.appendChild(tokenInput)
      document.body.appendChild(form)
      form.submit()
      document.body.removeChild(form)
      
      return { success: true }
    }
    
    return sessionResult
  },
}