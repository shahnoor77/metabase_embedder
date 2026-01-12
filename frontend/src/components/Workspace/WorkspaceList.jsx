import React, { useState, useEffect } from 'react';
import { Plus, Folder, Calendar, ExternalLink, Loader2, X } from 'lucide-react';
import { workspaceAPI } from '../services/api'; // Using the modular API we built
import toast from 'react-hot-toast';

const WorkspaceList = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: ''
  });
  const [creating, setCreating] = useState(false);

  // Load workspaces on mount
  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const response = await workspaceAPI.getAll();
      setWorkspaces(response.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load workspaces');
      console.error('Error loading workspaces:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) return toast.error('Please enter a name');

    try {
      setCreating(true);
      // We send name and description to our backend
      const response = await workspaceAPI.create(createForm);
      
      setWorkspaces([response.data, ...workspaces]);
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '' });
      toast.success('Workspace created and Metabase group provisioned!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenWorkspace = async (workspace) => {
    const loadingToast = toast.loading('Generating secure session...');
    try {
      const response = await workspaceAPI.getEmbedUrl(workspace.id);
      const url = response.data.url;

      if (url) {
        toast.dismiss(loadingToast);
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('Metabase URL not found for this workspace');
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Could not open Metabase: ' + (err.response?.data?.detail || err.message));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recent';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading your analytics environment...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Workspaces</h1>
          <p className="mt-2 text-gray-600">
            Manage your multi-tenant analytics collections and user groups.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-6 py-3 rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Workspace
        </button>
      </div>

      {/* Workspaces Grid */}
      {workspaces.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
          <Folder className="mx-auto h-16 w-16 text-gray-200" />
          <h3 className="mt-4 text-lg font-bold text-gray-900">No workspaces found</h3>
          <p className="mt-1 text-gray-500">Get started by creating a new workspace for your team.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 inline-flex items-center px-4 py-2 text-blue-600 font-bold hover:underline"
          >
            Create your first workspace →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Folder className="h-6 w-6" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">{workspace.name}</h3>
                <p className="text-sm text-gray-500 mb-6 line-clamp-2 h-10">
                  {workspace.description || 'No description provided for this workspace.'}
                </p>

                <div className="flex items-center text-xs text-gray-400 mb-6">
                  <Calendar className="h-4 w-4 mr-2" />
                  Created {formatDate(workspace.created_at)}
                </div>

                <button
                  onClick={() => handleOpenWorkspace(workspace)}
                  className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl font-bold text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Metabase
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">New Workspace</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Workspace Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Sales Team"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="What is this workspace for?"
                  rows="3"
                />
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 font-semibold hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceList;