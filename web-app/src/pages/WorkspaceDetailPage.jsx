import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/api/client';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { WorkspaceProvider, useWorkspaceStore } from '../contexts/WorkspaceContext';
import { AppLayout } from '../layouts/AppLayout';
import { RichMarkdownRenderer } from '../components/ui/RichMarkdownRenderer';
import { LearningUnitModal } from '../components/unit/LearningUnitModal';
import { WorkspaceRagAssistant } from '../components/workspace/WorkspaceRagAssistant';
import { WorkspaceCollaborators } from '../components/workspace/WorkspaceCollaborators';

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

const WorkspaceDetailPageContent = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const {
    workspaces: allWorkspaces,
    workspace,
    documents,
    summary: summaryData,
    learningPath: learningPathData,
    loading,
    docsLoading,
    summaryLoaded,
    learningPathLoaded,
    addOptimisticDoc,
    updateOptimisticDoc,
    removeOptimisticDoc,
    refetchWorkspaces: fetchWorkspaceList,
    refetchDocuments: fetchDocuments,
    refetchSummary: fetchSummary,
    refetchLearningPath: fetchLearningPath,
    setSummary: setSummaryData,
    setLearningPath: setLearningPathData,
    setDocuments,
  } = useWorkspaceStore();

  const [error, setError] = useState(null);

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'UPLOADING':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', color: '#60a5fa', background: 'rgba(96, 165, 250, 0.12)', border: '1px solid rgba(96, 165, 250, 0.25)', padding: '3px 9px', borderRadius: '12px' }}>
            <Spinner size="sm" /> Uploading...
          </span>
        );
      case 'PARSING':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '3px 9px', borderRadius: '12px' }}>
            <Spinner size="sm" /> Parsing...
          </span>
        );
      case 'CHUNKING':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', color: '#c084fc', background: 'rgba(192, 132, 252, 0.12)', border: '1px solid rgba(192, 132, 252, 0.25)', padding: '3px 9px', borderRadius: '12px' }}>
            <Spinner size="sm" /> Chunking...
          </span>
        );
      case 'EMBEDDING':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '3px 9px', borderRadius: '12px' }}>
            <Spinner size="sm" /> Embedding...
          </span>
        );
      case 'READY_FOR_RAG':
      case 'READY':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '600', color: '#3ecf8e', background: 'rgba(62, 207, 142, 0.12)', border: '1px solid rgba(62, 207, 142, 0.25)', padding: '3px 9px', borderRadius: '12px' }}>
            <i className="ti ti-check" style={{ fontSize: '12px' }}></i> Ready
          </span>
        );
      case 'FAILED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '600', color: '#f87171', background: 'rgba(248, 113, 113, 0.12)', border: '1px solid rgba(248, 113, 113, 0.25)', padding: '3px 9px', borderRadius: '12px' }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: '12px' }}></i> Failed
          </span>
        );
      default:
        return <span className="doc-status">{status}</span>;
    }
  };

  // Summary generation state
  const [summaryStatus, setSummaryStatus] = useState(null); // 'QUEUED' | 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  const [summaryProgressText, setSummaryProgressText] = useState('');
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Learning Path state
  const [learningPathStatus, setLearningPathStatus] = useState(null); // 'QUEUED' | 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  const [learningPathProgressText, setLearningPathProgressText] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(null);

  // Archived Workspaces state
  const [archivedWorkspaces, setArchivedWorkspaces] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);

  // Tab state initialized from URL param or location state
  const initialTab = searchParams.get('tab') || location.state?.tab || 'documents';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || location.state?.tab;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, location.state]);

  // Initial load on mount or workspace change
  useEffect(() => {
    fetchWorkspaceList();
    if (workspaceId) {
      fetchDocuments(workspaceId);
    }
  }, [workspaceId, fetchWorkspaceList, fetchDocuments]);

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

  // Step 5: Fetch archived workspaces list
  const fetchArchivedWorkspaces = async () => {
    try {
      setArchivedLoading(true);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await apiClient.get('/api/v1/workspaces/archived/list', { headers });
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
      await apiClient.post(`/api/v1/workspaces/${wsId}/restore`, {}, { headers });
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
      await apiClient.delete(`/api/v1/workspaces/${wsId}`, { headers });
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
      const res = await apiClient.post(
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
      await apiClient.patch(`/api/v1/workspaces/${renameTarget.id}`, { name: renameValue.trim() }, { headers });
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
      await apiClient.post(`/api/v1/workspaces/${ws.id}/archive`, {}, { headers });
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
      await apiClient.delete(`/api/v1/workspaces/${ws.id}`, { headers });
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

    const requestedTab = searchParams.get('tab') || location.state?.tab;
    if (!requestedTab) {
      setActiveTab('documents');
    }

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
    if (tab === 'archived') {
      navigate('/workspaces?tab=archived');
    } else {
      setSearchParams(tab === 'documents' ? {} : { tab });
    }

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
            apiClient.get(`/api/v1/workspaces/${workspaceId}/summary`, { headers }).then((res) => {
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
            apiClient.get(`/api/v1/workspaces/${workspaceId}/learning-path`, { headers }).then((res) => {
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
      const res = await apiClient.post(`/api/v1/ai/workspaces/${workspaceId}/summary`, {}, { headers });
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
      const res = await apiClient.post(`/api/v1/ai/workspaces/${workspaceId}/learning-path`, {}, { headers });
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

    const MAX_SIZE_MB = 50;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    const validFiles = [];

    for (const file of Array.from(filesToUpload)) {
      if (file.size > MAX_SIZE_BYTES) {
        alert(`File "${file.name}" exceeds the maximum allowed upload limit of ${MAX_SIZE_MB} MB.`);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    const token = localStorage.getItem('access_token');
    const headers = {
      ...(user?.id ? { 'X-User-ID': user.id } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };

    const uploadPromises = validFiles.map(async (file) => {
      const clientUploadId = `upl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const optEntry = addOptimisticDoc({
        upload_id: clientUploadId,
        filename: file.name,
        original_filename: file.name,
        status: 'UPLOADING',
        file_size_bytes: file.size,
      });
      const tempId = optEntry.id;

      try {
        const formData = new FormData();
        formData.append('workspace_id', workspaceId);
        formData.append('file', file);
        formData.append('upload_id', clientUploadId);

        const uploadRes = await apiClient.post('/api/v1/documents/raw', formData, {
          headers: {
            ...headers,
            'Content-Type': 'multipart/form-data',
            'X-Upload-ID': clientUploadId,
          },
        });
        updateOptimisticDoc(tempId, { status: 'PARSING', upload_id: clientUploadId });
        return { file, doc: uploadRes.data, tempId };
      } catch (err) {
        updateOptimisticDoc(tempId, { status: 'FAILED' });
        setTimeout(() => removeOptimisticDoc(tempId), 4000);
        const detail = err.response?.data?.detail || err.message;
        alert(`Failed to upload "${file.name}": ${detail}`);
        console.error(`Error uploading ${file.name}:`, err);
        return { file, doc: null, tempId };
      }
    });

    const uploadedResults = await Promise.all(uploadPromises);

    uploadedResults.forEach(async (item) => {
      if (!item.doc) return;
      const createdDoc = item.doc;
      const filename = item.file.name;

      try {
        apiClient.post(`/api/v1/documents/${createdDoc.id}/validate`, {}, { headers })
          .then(() => {
            updateOptimisticDoc(item.tempId, { status: 'PARSING' });
            return apiClient.post(`/api/v1/documents/${createdDoc.id}/parse`, {}, { headers });
          })
          .then(() => {
            updateOptimisticDoc(item.tempId, { status: 'CHUNKING' });
            return apiClient.post(`/api/v1/documents/${createdDoc.id}/chunks`, {}, { headers });
          })
          .then(() => {
            updateOptimisticDoc(item.tempId, { status: 'EMBEDDING' });
            return fetchDocuments(workspaceId);
          })
          .catch((err) => {
            console.error(`Background ingestion error for ${filename}:`, err);
            updateOptimisticDoc(item.tempId, { status: 'FAILED' });
          });
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
      const res = await apiClient.get(`/api/v1/documents/${doc.id}/markdown`);
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
      const res = await apiClient.get(`/api/v1/documents/${doc.id}/chunks`);
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
      await apiClient.delete(`/api/v1/documents/${docId}`, { headers });
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
    <AppLayout
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      workspaceName={workspace?.name}
      docCount={documents.length}
      readyCount={readyCount}
      processingCount={processingCount}
    >
      <div>
        {/* ============ TAB 1: DOCUMENTS ============ */}
        {activeTab === 'documents' && (
          <div className="main-grid">
            {/* Documents List Island */}
            <div className="island docs-island">
              <div className="section-heading">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
                WORKSPACE DOCUMENTS
              </div>

              {documents.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-faint)', fontSize: '13px' }}>
                  No documents added yet. Drag & drop files or click upload to get started.
                </div>
              ) : (
                documents.map((doc) => (
                  <div className="doc-row" key={doc.id}>
                    <div className="doc-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                      </svg>
                    </div>
                    <div className="doc-info">
                      <div className="doc-name">{doc.original_filename || doc.filename}</div>
                      <div className="doc-meta">
                        {formatBytes(doc.file_size_bytes)} · {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Just now'}
                      </div>
                    </div>
                    {renderStatusBadge(doc.status)}
                    <div className="doc-actions">
                      {doc.storage_metadata_json?.web_view_link && (
                        <a
                          href={doc.storage_metadata_json.web_view_link.replace(/\/(edit|view)(\?.*)?$/, '/preview')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="icon-btn"
                          title="View in Drive"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </a>
                      )}
                      <span
                        className="icon-btn danger"
                        title="Delete"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                        </svg>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Upload Island */}
            <div className="island upload-island">
              <div className="section-heading">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                ADD FILES
              </div>

              <label
                htmlFor="file-input"
                className="upload-zone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleUploadFiles(e.dataTransfer.files);
                  }
                }}
              >
                <div className="upload-ico">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </div>
                <div className="upload-title">Drag and drop files or Click to upload files</div>
                <input
                  type="file"
                  id="file-input"
                  multiple
                  onChange={(e) => handleUploadFiles(e.target.files)}
                  style={{ display: 'none' }}
                />
                <div className="upload-rules">
                  <div className="rule">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    PDFs (scanned/OCR), Word, Excel, PPT
                  </div>
                  <div className="rule">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Images (PNG, JPG, WebP), TXT, code
                  </div>
                  <div className="rule">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Up to 50 MB per file
                  </div>
                </div>
              </label>
            </div>
          </div>
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
              /* ONE SINGLE UNIFIED ISLAND CARD */
              <div className="island" style={{ padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Header Actions Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-soft)', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2 2 7l10 5 10-5-10-5Z" />
                        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
                        {summaryData.title || 'Workspace Executive Summary'}
                      </h2>
                      <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>Synthesized AI Insights</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn" onClick={() => setIsJsonModalOpen(true)} style={{ fontSize: '12.5px', padding: '6px 12px' }}>
                      Raw JSON
                    </button>
                    <button className="btn btn-primary" onClick={handleGenerateSummary} style={{ fontSize: '12.5px', padding: '6px 12px' }}>
                      Regenerate
                    </button>
                  </div>
                </div>

                {/* Overview Section */}
                {summaryData.overview && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="ti ti-notes"></i> Overview
                    </h3>
                    <RichMarkdownRenderer content={summaryData.overview} />
                  </div>
                )}

                {/* Key Takeaways Section */}
                {summaryData.key_takeaways && summaryData.key_takeaways.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#4D7CF5', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="ti ti-bulb"></i> Key Takeaways
                    </h3>
                    <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {summaryData.key_takeaways.map((item, idx) => (
                        <li key={idx} style={{ fontSize: '13.5px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
                          <RichMarkdownRenderer content={item} compact />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Main Sections */}
                {summaryData.sections && summaryData.sections.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', borderTop: '1px solid var(--border-soft)', paddingTop: '20px' }}>
                    {summaryData.sections.map((sec, idx) => (
                      <div key={idx}>
                        <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '10px', borderBottom: '1px solid var(--border-soft)', paddingBottom: '6px' }}>
                          {sec.title}
                        </h4>
                        <RichMarkdownRenderer content={sec.content} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="island" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--island-2)', border: '1px solid var(--border)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '1rem' }}>
                  <i className="ti ti-sparkles"></i>
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '0.5rem' }}>AI Summary</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-faint)', maxWidth: '450px', marginBottom: '1.5rem' }}>
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
                            onClick={() => navigate(`/workspaces/${workspaceId}/units/${encodeURIComponent(unit.title)}`)}
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
            <WorkspaceRagAssistant workspaceId={workspaceId} documents={documents} />
          </section>
        )}

        {/* ============ TAB 5: COLLABORATORS ============ */}
        {activeTab === 'collab' && (
          <section className="tab-panel active" id="panel-collab">
            <WorkspaceCollaborators workspace={workspace} />
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

export const WorkspaceDetailPage = () => {
  const { workspaceId } = useParams();
  return (
    <WorkspaceProvider activeWorkspaceId={workspaceId}>
      <WorkspaceDetailPageContent />
    </WorkspaceProvider>
  );
};




