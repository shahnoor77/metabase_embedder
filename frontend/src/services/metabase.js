import { workspaceAPI } from './api'

export const metabaseService = {
  // Get embed URL for a workspace (uses workspace API)
  getWorkspaceUrl: async (workspaceId) => {
    try {
      const response = await workspaceAPI.getEmbedUrl(workspaceId)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to get URL',
      }
    }
  },

  // Open Metabase workspace in new window
  openMetabaseWorkspace: (workspaceUrl) => {
    const metabaseWindow = window.open(
      workspaceUrl,
      '_blank',
      'noopener,noreferrer'
    )

    if (!metabaseWindow) {
      return {
        success: false,
        error: 'Please allow popups for this site',
      }
    }

    return { success: true }
  },
}