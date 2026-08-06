import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { AppLayout } from '../layouts/AppLayout';
import { RichMarkdownRenderer } from '../components/ui/RichMarkdownRenderer';
import { LearningUnitModal } from '../components/unit/LearningUnitModal';

const getFileIcon = (filename) => {
  if (!filename) return 'ti-file';
  const ext = filename.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return 'ti-file-type-pdf';
  if (['doc', 'docx'].includes(ext)) return 'ti-file-type-doc';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'ti-file-type-xls';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return 'ti-file-type-jpg';
  if (['txt', 'md'].includes(ext)) return 'ti-file-text';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'ti-file-zip';
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'html', 'css', 'json'].includes(ext)) return 'ti-file-code';
  return 'ti-file-description';
};

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const WorkspaceDetailPage = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState(null);
  const [allWorkspaces, setAllWorkspaces] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);       // workspace list + docs
  const [docsLoading, setDocsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Lazy-load flags
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [learningPathLoaded, setLearningPathLoaded] = useState(false);

  // Summary generation state
  const [summaryData, setSummaryData] = useState(null);
  const [summaryStatus, setSummaryStatus] = useState(null); // 'QUEUED' | 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  const [summaryProgressText, setSummaryProgressText] = useState('');
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Learning Path state
  const [learningPathData, setLearningPathData] = useState(null);
  const [learningPathStatus, setLearningPathStatus] = useState(null); // 'QUEUED' | 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  const [learningPathProgressText, setLearningPathProgressText] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(null);

  // Archived Workspaces state
  const [archivedWorkspaces, setArchivedWorkspaces] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('documents');

  // Custom Dropdown open state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Markdown viewer modal
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [markdownContent, setMarkdownContent] = useState('');
  const [loadingMarkdown, setLoadingMarkdown] = useState(false);

  // Chunks viewer modal
  const [selectedDocChunks, setSelectedDocChunks] = useState(null);
  const [chunksList, setChunksList] = useState([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  // Workspace Creation Modal
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDescription, setNewWsDescription] = useState('');
  const [creatingWs, setCreatingWs] = useState(false);

  // Rename Modal
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null); // { id, name }
  const [renameValue, setRenameValue] = useState('');
  const [renamingWs, setRenamingWs] = useState(false);

  // Step 1: Fetch workspace list only
  const fetchWorkspaceList = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const allWsRes = await axios.get('/api/v1/workspaces', { headers });
      const wsList = allWsRes.data.workspaces || [];
      setAllWorkspaces(wsList);

      if (!workspaceId && wsList.length > 0) {
        // Redirect to first workspace; documents will load via workspaceId effect
        navigate(`/workspaces/${wsList[0].id}`, { replace: true });
        return;
      }

      // Populate workspace info from list without extra API call
      if (workspaceId) {
        const found = wsList.find((w) => w.id === workspaceId) || null;
        setWorkspace(found);
        await fetchDocuments(workspaceId, headers);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
      setError('Unable to load workspaces.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Fetch documents for selected workspace
  const fetchDocuments = async (wsId, headers) => {
    if (!wsId) return;
    const h = headers || (user?.id ? { 'X-User-ID': user.id } : {});
    try {
      setDocsLoading(true);
      const docsRes = await axios.get(`/api/v1/documents?workspace_id=${wsId}`, { headers: h });
      setDocuments(docsRes.data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  };

  // Step 3: Fetch summary — called lazily when summary tab is opened
  const fetchSummary = async () => {
    if (!workspaceId || summaryLoaded) return;
    const headers = user?.id ? { 'X-User-ID': user.id } : {};
    try {
      const res = await axios.get(`/api/v1/workspaces/${workspaceId}/summary`, { headers });
      setSummaryData((res.data && res.data.summary) || null);
    } catch (err) {
      console.error('Failed to load summary:', err);
      setSummaryData(null);
    } finally {
      setSummaryLoaded(true);
    }
  };

  // Step 4: Fetch learning path — called lazily when learning tab is opened
  const fetchLearningPath = async () => {
    if (!workspaceId || learningPathLoaded) return;
    const headers = user?.id ? { 'X-User-ID': user.id } : {};
    try {
      const res = await axios.get(`/api/v1/workspaces/${workspaceId}/learning-path`, { headers });
      setLearningPathData((res.data && res.data.learning_path) || null);
    } catch (err) {
      console.error('Failed to load learning path:', err);
      setLearningPathData(null);
    } finally {
      setLearningPathLoaded(true);
    }
  };

  // Step 5: Fetch archived workspaces list
  const fetchArchivedWorkspaces = async () => {
    try {
      setArchivedLoading(true);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await axios.get('/api/v1/workspaces/archived/list', { headers });
      setArchivedWorkspaces(res.data.workspaces || []);
    } catch (err) {
      console.error('Failed to fetch archived workspaces:', err);
      setArchivedWorkspaces([]);
    } finally {
      setArchivedLoading(false);
    }
  };

  const handleRestoreWorkspace = async (wsId) => {
    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await axios.post(`/api/v1/workspaces/${wsId}/restore`, {}, { headers });
      await fetchArchivedWorkspaces();
      await fetchWorkspaceList();
    } catch (err) {
      console.error('Failed to restore workspace:', err);
      alert('Failed to un-archive workspace');
    }
  };

  const handlePermanentDeleteWorkspace = async (wsId, wsName) => {
    if (!confirm(`Permanently delete "${wsName}"? This cannot be undone.`)) return;
    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await axios.delete(`/api/v1/workspaces/${wsId}`, { headers });
      await fetchArchivedWorkspaces();
      await fetchWorkspaceList();
    } catch (err) {
      console.error('Failed to delete workspace:', err);
      alert('Failed to delete workspace');
    }
  };

  // Legacy: used by polling loop for silent document refresh
  const fetchWorkspaceAndDocs = async (silent = false) => {
    if (!silent) return fetchWorkspaceList();
    // silent = true: just refresh documents
    const headers = user?.id ? { 'X-User-ID': user.id } : {};
    if (workspaceId) await fetchDocuments(workspaceId, headers);
  };

  const handleCreateWorkspaceSubmit = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    try {
      setCreatingWs(true);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await axios.post(
        '/api/v1/workspaces',
        {
          name: newWsName.trim(),
          description: newWsDescription.trim() || null,
          visibility: 'PRIVATE',
        },
        { headers }
      );

      setNewWsName('');
      setNewWsDescription('');
      setIsCreateWsOpen(false);
      setIsDropdownOpen(false);

      const createdWs = res.data;
      navigate(`/workspaces/${createdWs.id}`);
    } catch (err) {
      console.error('Failed to create workspace:', err);
      alert('Failed to create workspace');
    } finally {
      setCreatingWs(false);
    }
  };


  const openRenameModal = (ws, e) => {
    e.stopPropagation();
    setRenameTarget(ws);
    setRenameValue(ws.name);
    setIsRenameOpen(true);
    setIsDropdownOpen(false);
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!renameValue.trim() || !renameTarget) return;
    try {
      setRenamingWs(true);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await axios.patch(`/api/v1/workspaces/${renameTarget.id}`, { name: renameValue.trim() }, { headers });
      setIsRenameOpen(false);
      setRenameTarget(null);
      await fetchWorkspaceAndDocs(true);
    } catch (err) {
      console.error('Failed to rename workspace:', err);
      alert('Failed to rename workspace');
    } finally {
      setRenamingWs(false);
    }
  };

  const handleArchiveWorkspace = async (ws, e) => {
    e.stopPropagation();
    if (!confirm(`Archive "${ws.name}"? It will be hidden from your workspace list.`)) return;
    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await axios.post(`/api/v1/workspaces/${ws.id}/archive`, {}, { headers });
      setIsDropdownOpen(false);
      // If archiving the currently viewed workspace, navigate away
      if (ws.id === workspaceId) {
        const remaining = allWorkspaces.filter(w => w.id !== ws.id);
        if (remaining.length > 0) navigate(`/workspaces/${remaining[0].id}`);
        else navigate('/workspaces');
      } else {
        await fetchWorkspaceAndDocs(true);
      }
    } catch (err) {
      console.error('Failed to archive workspace:', err);
      alert('Failed to archive workspace');
    }
  };

  const handleDeleteWorkspace = async (ws, e) => {
    e.stopPropagation();
    if (!confirm(`Permanently delete "${ws.name}"? This cannot be undone.`)) return;
    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await axios.delete(`/api/v1/workspaces/${ws.id}`, { headers });
      setIsDropdownOpen(false);
      if (ws.id === workspaceId) {
        const remaining = allWorkspaces.filter(w => w.id !== ws.id);
        if (remaining.length > 0) navigate(`/workspaces/${remaining[0].id}`);
        else navigate('/workspaces');
      } else {
        await fetchWorkspaceAndDocs(true);
      }
    } catch (err) {
      console.error('Failed to delete workspace:', err);
      alert('Failed to delete workspace');
    }
  };
  // On mount: fetch workspace list (which also triggers doc fetch)
  useEffect(() => {
    fetchWorkspaceList();
  }, []);

  // On workspace switch: update active workspace info + fetch docs; reset lazy flags
  useEffect(() => {
    if (!workspaceId) return;
    setSummaryLoaded(false);
    setSummaryData(null);
    setLearningPathLoaded(false);
    setLearningPathData(null);
    setActiveTab('documents');
    setAllWorkspaces((prev) => {
      const found = prev.find((w) => w.id === workspaceId) || null;
      setWorkspace(found);
      return prev;
    });
    fetchDocuments(workspaceId);
  }, [workspaceId]);

  // Lazy-load tab data when tab is opened
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'summary') {
      fetchSummary();
    } else if (tab === 'learning') {
      fetchLearningPath();
    } else if (tab === 'archived') {
      fetchArchivedWorkspaces();
    }
  };

  // Trigger tab data fetch whenever activeTab or workspaceId changes
  useEffect(() => {
    if (activeTab === 'summary') {
      fetchSummary();
    } else if (activeTab === 'learning') {
      fetchLearningPath();
    } else if (activeTab === 'archived') {
      fetchArchivedWorkspaces();
    }
  }, [activeTab, workspaceId]);

  // Listen to SSE events for real-time SummaryGeneration & LearningPathGeneration progress
  useEffect(() => {
    if (!workspaceId) return;
    const eventSource = new EventSource('/api/v1/notifications/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event_name === 'SummaryGeneration' && data.workspace_id === workspaceId) {
          setSummaryStatus(data.status);
          if (data.status === 'QUEUED') setSummaryProgressText('Generating Summary...');
          else if (data.status === 'STARTED') setSummaryProgressText('Collecting Workspace Content...');
          else if (data.status === 'IN_PROGRESS') setSummaryProgressText('Generating Educational Summary...');
          else if (data.status === 'COMPLETED') {
            setSummaryProgressText('Completed');
            const headers = user?.id ? { 'X-User-ID': user.id } : {};
            axios.get(`/api/v1/workspaces/${workspaceId}/summary`, { headers }).then((res) => {
              if (res.data && res.data.summary) {
                setSummaryData(res.data.summary);
                setSummaryLoaded(true);
              }
              setSummaryStatus(null);
            }).catch(() => setSummaryStatus(null));
          } else if (data.status === 'FAILED') {
            setSummaryProgressText('Failed: ' + (data.error || 'Unknown error'));
            setTimeout(() => setSummaryStatus(null), 4000);
          }
        } else if (data.event_name === 'LearningPathGeneration' && data.workspace_id === workspaceId) {
          setLearningPathStatus(data.status);
          if (data.status === 'QUEUED') setLearningPathProgressText('Generating Learning Path...');
          else if (data.status === 'STARTED') setLearningPathProgressText('Collecting Workspace Structure...');
          else if (data.status === 'IN_PROGRESS') setLearningPathProgressText('Building Curriculum Units...');
          else if (data.status === 'COMPLETED') {
            setLearningPathProgressText('Completed');
            const headers = user?.id ? { 'X-User-ID': user.id } : {};
            axios.get(`/api/v1/workspaces/${workspaceId}/learning-path`, { headers }).then((res) => {
              if (res.data && res.data.learning_path) {
                setLearningPathData(res.data.learning_path);
                setLearningPathLoaded(true);
              }
              setLearningPathStatus(null);
            }).catch(() => setLearningPathStatus(null));
          } else if (data.status === 'FAILED') {
            setLearningPathProgressText('Failed: ' + (data.error || 'Unknown error'));
            setTimeout(() => setLearningPathStatus(null), 4000);
          }
        }
      } catch (e) {}
    };

    return () => eventSource.close();
  }, [workspaceId]);

  const handleGenerateSummary = async () => {
    try {
      setSummaryStatus('QUEUED');
      setSummaryProgressText('Generating Summary...');
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await axios.post(`/api/v1/ai/workspaces/${workspaceId}/summary`, {}, { headers });
      if (res.data) {
        setSummaryData(res.data);
        setSummaryLoaded(true);
      }
      setSummaryStatus(null);
    } catch (err) {
      console.error('Failed to trigger summary generation:', err);
      setSummaryStatus('FAILED');
      setSummaryProgressText('Failed to start summary generation');
      setTimeout(() => setSummaryStatus(null), 3000);
    }
  };

  const handleGenerateLearningPath = async () => {
    try {
      setLearningPathStatus('QUEUED');
      setLearningPathProgressText('Generating Learning Path...');
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await axios.post(`/api/v1/ai/workspaces/${workspaceId}/learning-path`, {}, { headers });
      if (res.data) {
        setLearningPathData(res.data);
        setLearningPathLoaded(true);
      }
      setLearningPathStatus(null);
    } catch (err) {
      console.error('Failed to trigger learning path generation:', err);
      setLearningPathStatus('FAILED');
      setLearningPathProgressText('Failed to start learning path generation');
      setTimeout(() => setLearningPathStatus(null), 3000);
    }
  };

  // Polling loop for active document processing
  useEffect(() => {
    const hasActiveProcessing = documents.some(
      (d) => d.status !== 'READY_FOR_RAG' && d.status !== 'FAILED'
    );

    if (hasActiveProcessing) {
      const interval = setInterval(() => {
        fetchWorkspaceAndDocs(true);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [documents]);

  const handleUploadFiles = async (filesToUpload) => {
    if (!filesToUpload || filesToUpload.length === 0) return;

    const token = localStorage.getItem('access_token');
    const headers = {
      ...(user?.id ? { 'X-User-ID': user.id } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };

    const uploadPromises = Array.from(filesToUpload).map(async (file) => {
      try {
        const formData = new FormData();
        formData.append('workspace_id', workspaceId);
        formData.append('file', file);

        const uploadRes = await axios.post('/api/v1/documents/raw', formData, {
          headers: {
            ...headers,
            'Content-Type': 'multipart/form-data',
          },
        });
        return { file, doc: uploadRes.data };
      } catch (err) {
        console.error(`Error uploading ${file.name}:`, err);
        return { file, doc: null };
      }
    });

    const uploadedResults = await Promise.all(uploadPromises);
    await fetchWorkspaceAndDocs(true);

    uploadedResults.forEach(async (item) => {
      if (!item.doc) return;
      const createdDoc = item.doc;
      const filename = item.file.name;

      try {
        axios.post(`/api/v1/documents/${createdDoc.id}/validate`, {}, { headers })
          .then(() => axios.post(`/api/v1/documents/${createdDoc.id}/parse`, {}, { headers }))
          .then(() => axios.post(`/api/v1/documents/${createdDoc.id}/chunks`, {}, { headers }))
          .catch((err) => console.error(`Background ingestion error for ${filename}:`, err));
      } catch (fileErr) {
        console.error(`Error initiating background processing for ${filename}:`, fileErr);
      }
    });
  };

  const handleViewMarkdown = async (doc) => {
    setSelectedDoc(doc);
    setLoadingMarkdown(true);
    setMarkdownContent('');
    try {
      const res = await axios.get(`/api/v1/documents/${doc.id}/markdown`);
      setMarkdownContent(res.data.markdown || 'No markdown content available.');
    } catch (err) {
      setMarkdownContent('Failed to fetch markdown content.');
    } finally {
      setLoadingMarkdown(false);
    }
  };

  const handleViewChunks = async (doc) => {
    setSelectedDocChunks(doc);
    setLoadingChunks(true);
    setChunksList([]);
    try {
      const res = await axios.get(`/api/v1/documents/${doc.id}/chunks`);
      setChunksList(res.data.chunks || []);
    } catch (err) {
      console.error('Failed to fetch chunks:', err);
    } finally {
      setLoadingChunks(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Are you sure you want to remove this document reference?')) return;
    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await axios.delete(`/api/v1/documents/${docId}`, { headers });
      await fetchWorkspaceAndDocs();
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert('Failed to delete document');
    }
  };

  const readyCount = documents.filter((d) => d.status === 'READY_FOR_RAG').length;
  const processingCount = documents.filter(
    (d) => d.status !== 'READY_FOR_RAG' && d.status !== 'FAILED'
  ).length;

  if (loading) {
    return (
      <AppLayout activeTab={activeTab} setActiveTab={handleTabChange} docCount={documents.length}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (!loading && allWorkspaces.length === 0) {
    return (
      <AppLayout activeTab={activeTab} setActiveTab={handleTabChange} docCount={0}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '2rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-3)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '1rem' }}>
            <i className="ti ti-folder-plus"></i>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '0.5rem' }}>No Workspaces Found</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: '400px', marginBottom: '1.5rem' }}>
            Get started by creating your first workspace to manage documents and collaborate with AI.
          </p>
          <button className="btn btn-primary" onClick={() => setIsCreateWsOpen(true)} style={{ padding: '8px 16px', fontSize: '13px' }}>
            <i className="ti ti-plus"></i> Create Workspace
          </button>
        </div>

        {/* Create Workspace Modal */}
        <Modal open={isCreateWsOpen} onOpenChange={setIsCreateWsOpen}>
          <ModalContent size="md" showCloseButton={false} style={{ background: '#16161a', border: '1px solid #2a2a2e', color: '#e4e4e7', borderRadius: '12px', padding: '0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}>

            <ModalHeader
              title="Create New Workspace"
              description="Set up a collaborative workspace for your documents and AI interactions."
              style={{ padding: '20px 24px', borderBottom: '1px solid #2a2a2e' }}
            />
            <form onSubmit={handleCreateWorkspaceSubmit}>
              <ModalBody style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#e4e4e7' }}>
                    Workspace Name <span style={{ color: '#3ecf8e' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AI Research Lab"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    required
                    autoFocus
                    style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '6px', background: '#0c0c0e', border: '1px solid #2a2a2e', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#e4e4e7' }}>
                    Description <span style={{ color: '#71717a', fontSize: '11px' }}>(Optional)</span>
                  </label>
                  <textarea
                    placeholder="Brief summary of the workspace purpose"
                    value={newWsDescription}
                    onChange={(e) => setNewWsDescription(e.target.value)}
                    rows={3}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', background: '#0c0c0e', border: '1px solid #2a2a2e', color: '#ffffff', fontSize: '13px', outline: 'none', resize: 'none' }}
                  />
                </div>
              </ModalBody>
              
              <ModalFooter style={{ padding: '16px 24px', borderTop: '1px solid #2a2a2e', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn" onClick={() => setIsCreateWsOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creatingWs || !newWsName.trim()}>
                  {creatingWs ? 'Creating...' : 'Create Workspace'}
                </button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>

      </AppLayout>
    );
  }

  if (error || !workspace) {
    return (
      <AppLayout activeTab={activeTab} setActiveTab={handleTabChange} docCount={documents.length}>
        <div style={{ padding: '2rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '6px' }}>
            {error || 'Workspace not found.'}
          </div>
        </div>
      </AppLayout>
    );
  }


  return (
    <AppLayout activeTab={activeTab} setActiveTab={handleTabChange} docCount={documents.length}>
      {/* ---------- TOPBAR ---------- */}
      <div className="topbar" id="topbar">
        <div className="topbar-left">
          {/* Custom Workspace Dropdown */}
          <div className={`custom-dropdown ${isDropdownOpen ? 'open' : ''}`} id="custom-workspace-dropdown">
            <div
              className="dropdown-trigger"
              id="dropdown-trigger"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <i className="ti ti-folder"></i>
              <span id="selected-workspace-label">{workspace.name}</span>
              <i className="ti ti-chevron-down"></i>
            </div>
            <div className="dropdown-menu" id="dropdown-menu">
              {allWorkspaces.map((ws) => (
                <div
                  key={ws.id}
                  className={`dropdown-item ws-dropdown-item ${ws.id === workspaceId ? 'selected' : ''}`}
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate(`/workspaces/${ws.id}`);
                  }}
                >
                  <i className="ti ti-folder" style={{ flexShrink: 0 }}></i>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</span>
                  <span className="ws-item-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="ws-action-btn"
                      title="Rename"
                      onClick={(e) => openRenameModal(ws, e)}
                    >
                      <i className="ti ti-pencil"></i>
                    </button>
                    <button
                      className="ws-action-btn"
                      title="Archive"
                      onClick={(e) => handleArchiveWorkspace(ws, e)}
                    >
                      <i className="ti ti-archive"></i>
                    </button>
                    <button
                      className="ws-action-btn ws-action-danger"
                      title="Delete"
                      onClick={(e) => handleDeleteWorkspace(ws, e)}
                    >
                      <i className="ti ti-trash"></i>
                    </button>
                  </span>
                </div>
              ))}
              <div
                className="dropdown-item"
                style={{ borderTop: '1px solid var(--border)', color: 'var(--accent)', fontWeight: '500', marginTop: '4px', paddingTop: '8px' }}
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsCreateWsOpen(true);
                }}
              >
                <i className="ti ti-plus" style={{ color: 'var(--accent)' }}></i> Create Workspace
              </div>
            </div>

          </div>
        </div>

        <div className="topbar-center">
          <div className="topbar-title" id="topbar-title">
            {activeTab === 'documents' && 'Documents'}
            {activeTab === 'summary' && 'AI summary'}
            {activeTab === 'learning' && 'Learning path'}
            {activeTab === 'rag' && 'RAG assistant'}
            {activeTab === 'collab' && 'Collaborators'}
          </div>
          <div className="topbar-sub" id="topbar-sub">
            {activeTab === 'documents' && `${readyCount} ready · ${processingCount} processing`}
            {activeTab === 'summary' && 'Generated from workspace documents'}
            {activeTab === 'learning' && 'Curriculum units generated from documents'}
            {activeTab === 'rag' && 'Grounded in workspace documents'}
            {activeTab === 'collab' && 'Workspace collaborators'}
          </div>
        </div>

        <div className="topbar-right" id="topbar-actions">
          {activeTab === 'documents' && (
            <>
              <label htmlFor="header-file-input" className="btn btn-primary" style={{ margin: 0, cursor: 'pointer' }}>
                <i className="ti ti-upload"></i>Upload
              </label>
              <input
                id="header-file-input"
                type="file"
                multiple
                onChange={(e) => handleUploadFiles(e.target.files)}
                style={{ display: 'none' }}
              />
            </>
          )}
          {activeTab === 'summary' && (
            <>
              {summaryData && (
                <button
                  className="btn"
                  onClick={() => setIsJsonModalOpen(true)}
                  style={{ marginRight: '8px' }}
                >
                  <i className="ti ti-code"></i>View Raw JSON
                </button>
              )}
              <button className="btn" onClick={handleGenerateSummary}>
                <i className="ti ti-refresh"></i>Regenerate
              </button>
            </>
          )}
          {activeTab === 'learning' && (
            <button className="btn" onClick={handleGenerateLearningPath}><i className="ti ti-refresh"></i>Regenerate path</button>
          )}
          {activeTab === 'rag' && (
            <button className="btn"><i className="ti ti-trash"></i>Clear</button>
          )}
          {activeTab === 'collab' && (
            <button className="btn btn-primary"><i className="ti ti-user-plus"></i>Invite</button>
          )}
        </div>
      </div>

      {/* ---------- MAIN CONTENT AREA ---------- */}
      <div className="content-area">
        {/* ============ TAB 1: DOCUMENTS ============ */}
        {activeTab === 'documents' && (
          <section className="tab-panel active" id="panel-documents">
            <div className="docs-grid">
              <div>
                <div className="section-label"><i className="ti ti-files"></i>Workspace documents</div>
                <div className="doc-list" id="doc-list">
                  {documents.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                      No documents added yet. Drag & drop files or click upload below.
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div className="doc-item" key={doc.id}>
                        <i className={`ti ${getFileIcon(doc.original_filename)} doc-icon`}></i>
                        <div className="doc-info">
                          <div className="doc-name">{doc.original_filename}</div>
                          <div className="doc-meta">
                            {formatBytes(doc.file_size_bytes)} · {new Date(doc.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <span className={`status-badge ${doc.status.toLowerCase().replace(/_/g, '-')}`}>
                          {doc.status === 'READY_FOR_RAG' ? 'READY' : doc.status}
                        </span>
                        {doc.storage_metadata_json?.web_view_link && (
                          <a
                            href={doc.storage_metadata_json.web_view_link.replace(/\/(edit|view)(\?.*)?$/, '/preview')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="icon-btn"
                            title="View in Drive"
                          >
                            <i className="ti ti-eye"></i>
                          </a>
                        )}
                        {(doc.status === 'READY' || doc.status === 'READY_FOR_RAG') && (
                          <i
                            className="ti ti-file-description icon-btn"
                            title="View Text"
                            onClick={() => handleViewMarkdown(doc)}
                          ></i>
                        )}
                        <i
                          className="ti ti-trash icon-btn"
                          title="Delete"
                          onClick={() => handleDeleteDocument(doc.id)}
                        ></i>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="section-label"><i className="ti ti-file-plus"></i>Add files</div>
                <label
                  htmlFor="file-input"
                  className="upload-zone"
                  id="drop-zone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleUploadFiles(e.dataTransfer.files);
                    }
                  }}
                  style={{ display: 'block' }}
                >
                  <i className="ti ti-upload"></i>
                  <p>Drag and drop files or Click to upload files</p>
                  <input
                    type="file"
                    id="file-input"
                    multiple
                    onChange={(e) => handleUploadFiles(e.target.files)}
                    style={{ display: 'none' }}
                  />
                  <ul className="upload-list">
                    <li><i className="ti ti-check"></i>PDFs (scanned/OCR), Word, Excel, PPT</li>
                    <li><i className="ti ti-check"></i>Images (PNG, JPG, WebP), TXT, code</li>
                    <li><i className="ti ti-check"></i>Up to 50 MB per file</li>
                  </ul>
                </label>
              </div>
            </div>
          </section>
        )}

        {/* ============ TAB 2: AI SUMMARY ============ */}
        {activeTab === 'summary' && (
          <section className="tab-panel active" id="panel-summary">
            {summaryStatus ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', textAlign: 'center', padding: '2rem' }}>
                <Spinner size="lg" />
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                  {summaryProgressText}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Synthesizing workspace documents using Gemini...</p>
              </div>
            ) : summaryData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '1rem 0' }}>

                {/* Overview */}
                {summaryData.overview && (
                  <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--accent)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="ti ti-notes"></i> Overview
                    </h3>
                    <RichMarkdownRenderer content={summaryData.overview} />
                  </div>
                )}

                {/* Key Takeaways */}
                {summaryData.key_takeaways && summaryData.key_takeaways.length > 0 && (
                  <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#3b82f6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="ti ti-bulb"></i> Key Takeaways
                    </h3>
                    <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {summaryData.key_takeaways.map((item, idx) => (
                        <li key={idx} style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.4' }}>
                          <RichMarkdownRenderer content={item} compact />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sections */}
                {summaryData.sections && summaryData.sections.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {summaryData.sections.map((sec, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                          {sec.title}
                        </h3>
                        <RichMarkdownRenderer content={sec.content} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', textAlign: 'center', padding: '2rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-3)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '1rem' }}>
                  <i className="ti ti-sparkles"></i>
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '0.5rem' }}>AI Summary</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: '450px', marginBottom: '1.5rem' }}>
                  {documents.length === 0
                    ? 'Upload documents to this workspace to generate an AI summary.'
                    : 'No summary generated yet. Click below to synthesize key insights from your workspace documents.'}
                </p>
                {documents.length > 0 && (
                  <button className="btn btn-primary" onClick={handleGenerateSummary} style={{ padding: '8px 16px', fontSize: '13px' }}>
                    <i className="ti ti-sparkles"></i> Generate Summary
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* ============ TAB 3: LEARNING PATH ============ */}
        {activeTab === 'learning' && (
          <section className="tab-panel active" id="panel-learning">
            {learningPathStatus ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', textAlign: 'center', padding: '2rem' }}>
                <Spinner size="lg" />
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                  {learningPathProgressText}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Building progressive curriculum units from document outlines using Gemini...</p>
              </div>
            ) : learningPathData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '1rem 0' }}>
                {/* Units List */}
                {learningPathData.units && learningPathData.units.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {learningPathData.units.map((unit, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
                            {idx + 1}
                          </div>
                          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', margin: 0 }}>
                            {unit.title}
                          </h3>
                        </div>

                        {unit.description && (
                          <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.5', marginBottom: '14px', paddingLeft: '40px' }}>
                            {unit.description}
                          </p>
                        )}

                        {/* Learning Objectives */}
                        {unit.learning_objectives && unit.learning_objectives.length > 0 && (
                          <div style={{ paddingLeft: '40px', marginBottom: '14px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Learning Objectives
                            </div>
                            <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', margin: 0 }}>
                              {unit.learning_objectives.map((obj, oIdx) => (
                                <li key={oIdx} style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.4' }}>
                                  {obj}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Tags */}
                        {unit.tags && unit.tags.length > 0 && (
                          <div style={{ paddingLeft: '40px', display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                            {unit.tags.map((tag, tIdx) => (
                              <span key={tIdx} style={{ fontSize: '11px', background: 'var(--bg-3)', color: 'var(--text-3)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', fontFamily: 'var(--mono)' }}>
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Open Unit Study Button */}
                        <div style={{ paddingLeft: '40px', display: 'flex' }}>
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: '12px', padding: '6px 14px', gap: '6px' }}
                            onClick={() => setSelectedUnit(unit)}
                          >
                            <i className="ti ti-book"></i> Open Learning Unit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', textAlign: 'center', padding: '2rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-3)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '1rem' }}>
                  <i className="ti ti-route"></i>
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '0.5rem' }}>Learning Path</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: '450px', marginBottom: '1.5rem' }}>
                  {documents.length === 0
                    ? 'Upload documents to build a custom structured learning path.'
                    : 'No learning path generated yet. Create a step-by-step curriculum from your documents.'}
                </p>
                {documents.length > 0 && (
                  <button className="btn btn-primary" onClick={handleGenerateLearningPath} style={{ padding: '8px 16px', fontSize: '13px' }}>
                    <i className="ti ti-sparkles"></i> Generate Learning Path
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* ============ TAB 4: RAG ASSISTANT ============ */}
        {activeTab === 'rag' && (
          <section className="tab-panel active" id="panel-rag">
            <div className="rag-wrap">
              <div className="rag-thread" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '30vh', textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-3)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '0.75rem' }}>
                  <i className="ti ti-message-bot"></i>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '0.25rem' }}>RAG Assistant</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: '400px' }}>
                  {documents.length === 0
                    ? 'Upload documents to start asking questions grounded in your workspace content.'
                    : 'Ask any question below to query your workspace documents.'}
                </p>
              </div>
              <div className="rag-input">
                <input type="text" placeholder="Ask a question about your workspace documents..." disabled={documents.length === 0} />
                <button className="btn btn-primary" disabled={documents.length === 0}><i className="ti ti-send"></i>Send</button>
              </div>
            </div>
          </section>
        )}

        {/* ============ TAB 5: COLLABORATORS ============ */}
        {activeTab === 'collab' && (
          <section className="tab-panel active" id="panel-collab">
            <div className="collab-card">
              <div className="collab-icon"><i className="ti ti-users"></i></div>
              <div>
                <h2>Workspace collaborators</h2>
                <p>Invite team members to read, edit, or manage this workspace</p>
              </div>
              <div className="collab-badge">1 member</div>
            </div>

            <div className="section-label"><i className="ti ti-user-plus"></i>Invite new collaborator</div>
            <div className="invite-row">
              <input type="email" placeholder="colleague@university.edu" />
              <select>
                <option>Viewer (read only)</option>
                <option>Editor</option>
                <option>Admin</option>
              </select>
              <button className="btn btn-primary"><i className="ti ti-user-plus"></i>Invite</button>
            </div>
          </section>
        )}

        {/* ============ TAB 6: ARCHIVED WORKSPACES ============ */}
        {activeTab === 'archived' && (
          <section className="tab-panel active" id="panel-archived">
            <div style={{ padding: '0.5rem 0' }}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>
                  Archived Workspaces
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>
                  Workspaces you have archived. Un-archive to restore them to your active list or permanently delete them.
                </p>
              </div>

              {archivedLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <Spinner size="lg" />
                </div>
              ) : archivedWorkspaces.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '35vh', textAlign: 'center', padding: '2rem', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-3)', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '1rem' }}>
                    <i className="ti ti-archive"></i>
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '0.4rem' }}>No archived workspaces</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>Workspaces you archive will appear here.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {archivedWorkspaces.map((ws) => (
                    <div
                      key={ws.id}
                      style={{
                        background: 'var(--bg-1)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: '10px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        justify: 'space-between',
                        gap: '16px',
                      }}
                    >
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', margin: '0 0 6px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ws.name}
                        </h3>
                        <div style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                          Created {new Date(ws.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                        <button
                          className="btn btn-primary"
                          style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => handleRestoreWorkspace(ws.id)}
                        >
                          <i className="ti ti-rotate-clockwise"></i> Un-archive
                        </button>
                        <button
                          className="btn"
                          style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--danger)', borderColor: 'var(--border-strong)' }}
                          onClick={() => handlePermanentDeleteWorkspace(ws.id, ws.name)}
                        >
                          <i className="ti ti-trash"></i> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Markdown Content Modal */}
      <Modal open={Boolean(selectedDoc)} onOpenChange={() => setSelectedDoc(null)}>
        <ModalContent size="lg" className="bg-[#16161a] border border-[#2a2a2e] text-white shadow-2xl">
          <ModalHeader
            title={selectedDoc?.original_filename || 'Parsed Document'}
            description="Plain text content extracted by LlamaParse."
          />
          <ModalBody className="py-4">
            {loadingMarkdown ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <Spinner size="lg" />
              </div>
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', backgroundColor: '#0c0c0e', padding: '1rem', borderRadius: '8px', border: '1px solid #2a2a2e', fontSize: '0.85rem', color: '#e4e4e7', maxHeight: '60vh', overflowY: 'auto' }}>
                {markdownContent}
              </pre>
            )}
          </ModalBody>
          <ModalFooter className="pt-4 border-t border-[#2a2a2e]">
            <button
              onClick={() => setSelectedDoc(null)}
              style={{ backgroundColor: '#27272a', color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
            >
              Close
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create Workspace Modal */}
      <Modal open={isCreateWsOpen} onOpenChange={setIsCreateWsOpen}>
        <ModalContent size="md" showCloseButton={false} style={{ background: '#16161a', border: '1px solid #2a2a2e', color: '#e4e4e7', borderRadius: '12px', padding: '0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}>

          <ModalHeader
            title="Create New Workspace"
            description="Set up a collaborative workspace for your documents and AI interactions."
            style={{ padding: '20px 24px', borderBottom: '1px solid #2a2a2e' }}
          />
          <form onSubmit={handleCreateWorkspaceSubmit}>
            <ModalBody style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#e4e4e7' }}>
                  Workspace Name <span style={{ color: '#3ecf8e' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI Research Lab"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  required
                  autoFocus
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '6px', background: '#0c0c0e', border: '1px solid #2a2a2e', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#e4e4e7' }}>
                  Description <span style={{ color: '#71717a', fontSize: '11px' }}>(Optional)</span>
                </label>
                <textarea
                  placeholder="Brief summary of the workspace purpose"
                  value={newWsDescription}
                  onChange={(e) => setNewWsDescription(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', background: '#0c0c0e', border: '1px solid #2a2a2e', color: '#ffffff', fontSize: '13px', outline: 'none', resize: 'none' }}
                />
              </div>
            </ModalBody>
            
            <ModalFooter style={{ padding: '16px 24px', borderTop: '1px solid #2a2a2e', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn" onClick={() => setIsCreateWsOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={creatingWs || !newWsName.trim()}>
                {creatingWs ? 'Creating...' : 'Create Workspace'}
              </button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Rename Workspace Modal */}
      <Modal open={isRenameOpen} onOpenChange={(open) => { if (!open) { setIsRenameOpen(false); setRenameTarget(null); } }}>
        <ModalContent size="sm" showCloseButton={false} style={{ background: '#16161a', border: '1px solid #2a2a2e', color: '#e4e4e7', borderRadius: '12px', padding: '0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' }}>
          <ModalHeader
            title="Rename Workspace"
            description="Enter a new name for this workspace."
            style={{ padding: '20px 24px', borderBottom: '1px solid #2a2a2e' }}
          />
          <form onSubmit={handleRenameSubmit}>
            <ModalBody style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#e4e4e7' }}>
                  Workspace Name <span style={{ color: '#3ecf8e' }}>*</span>
                </label>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  required
                  autoFocus
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '6px', background: '#0c0c0e', border: '1px solid #2a2a2e', color: '#ffffff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </ModalBody>
            <ModalFooter style={{ padding: '16px 24px', borderTop: '1px solid #2a2a2e', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn" onClick={() => { setIsRenameOpen(false); setRenameTarget(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={renamingWs || !renameValue.trim()}>
                {renamingWs ? 'Saving...' : 'Save'}
              </button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Raw JSON Payload Modal */}
      <Modal open={isJsonModalOpen} onOpenChange={setIsJsonModalOpen}>
        <ModalContent size="lg" showCloseButton={false} style={{ background: '#16161a', border: '1px solid #2a2a2e', color: '#e4e4e7', borderRadius: '12px', padding: '0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)', maxWidth: '800px', width: '90%' }}>
          <ModalHeader
            title="Raw Summary JSON Payload"
            description="The exact JSON schema response received from Gemini and stored in the database."
            style={{ padding: '20px 24px', borderBottom: '1px solid #2a2a2e' }}
          />
          <ModalBody style={{ padding: '20px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
            <pre style={{ background: '#0c0c0e', border: '1px solid #2a2a2e', borderRadius: '8px', padding: '16px', color: '#a6e3a1', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
              {JSON.stringify(summaryData, null, 2)}
            </pre>
          </ModalBody>
          <ModalFooter style={{ padding: '16px 24px', borderTop: '1px solid #2a2a2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(summaryData, null, 2));
                setCopiedJson(true);
                setTimeout(() => setCopiedJson(false), 2000);
              }}
            >
              <i className={copiedJson ? "ti ti-check" : "ti ti-copy"}></i>
              {copiedJson ? "Copied!" : "Copy JSON"}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setIsJsonModalOpen(false)}>
              Close
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Learning Unit Study Modal */}
      <LearningUnitModal
        open={Boolean(selectedUnit)}
        onClose={() => setSelectedUnit(null)}
        unit={selectedUnit}
        workspaceId={workspaceId}
      />

    </AppLayout>
  );
};




