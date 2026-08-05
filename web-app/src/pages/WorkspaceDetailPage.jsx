import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { AppLayout } from '../layouts/AppLayout';

export const WorkspaceDetailPage = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState(null);
  const [allWorkspaces, setAllWorkspaces] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const fetchWorkspaceAndDocs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};

      const allWsRes = await axios.get('/api/v1/workspaces', { headers });
      const wsList = allWsRes.data.workspaces || [];
      setAllWorkspaces(wsList);

      let targetWsId = workspaceId;
      if (!targetWsId && wsList.length > 0) {
        targetWsId = wsList[0].id;
        navigate(`/workspaces/${targetWsId}`, { replace: true });
        return;
      }

      if (targetWsId) {
        const [wsRes, docsRes] = await Promise.all([
          axios.get(`/api/v1/workspaces/${targetWsId}`, { headers }),
          axios.get(`/api/v1/documents?workspace_id=${targetWsId}`, { headers }),
        ]);
        setWorkspace(wsRes.data);
        setDocuments(docsRes.data.documents || []);
      } else {
        setWorkspace(null);
        setDocuments([]);
      }
    } catch (err) {
      console.error('Failed to load workspace detail:', err);
      if (!silent) setError('Unable to load workspace details.');
    } finally {
      if (!silent) setLoading(false);
    }
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


  useEffect(() => {
    fetchWorkspaceAndDocs();
  }, [workspaceId]);

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
      <AppLayout activeTab={activeTab} setActiveTab={setActiveTab} docCount={documents.length}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (!loading && allWorkspaces.length === 0) {
    return (
      <AppLayout activeTab={activeTab} setActiveTab={setActiveTab} docCount={0}>
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
      <AppLayout activeTab={activeTab} setActiveTab={setActiveTab} docCount={documents.length}>
        <div style={{ padding: '2rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '6px' }}>
            {error || 'Workspace not found.'}
          </div>
        </div>
      </AppLayout>
    );
  }


  return (
    <AppLayout activeTab={activeTab} setActiveTab={setActiveTab} docCount={documents.length}>
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
                  className={`dropdown-item ${ws.id === workspaceId ? 'selected' : ''}`}
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate(`/workspaces/${ws.id}`);
                  }}
                >
                  <i className="ti ti-code"></i> {ws.name}
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
            {activeTab === 'learning' && '45 curriculum units'}
            {activeTab === 'rag' && 'Grounded in workspace documents'}
            {activeTab === 'collab' && '1 active member'}
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
            <button className="btn"><i className="ti ti-refresh"></i>Regenerate</button>
          )}
          {activeTab === 'learning' && (
            <button className="btn"><i className="ti ti-refresh"></i>Regenerate path</button>
          )}
          {activeTab === 'rag' && (
            <button className="btn"><i className="ti ti-trash"></i>Clear</button>
          )}
          {activeTab === 'collab' && (
            <button className="btn btn-primary"><i className="ti ti-user-plus"></i>Invite</button>
          )}
        </div>
      </div>

      <div className="content">
        {/* ============ TAB 1: DOCUMENTS ============ */}
        {activeTab === 'documents' && (
          <section className="tab-panel active" id="panel-documents">
            <div className="doc-layout">
              <div>
                <div className="section-label"><i className="ti ti-folder"></i>Workspace documents</div>
                <div className="doc-list">
                  {documents.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-4)' }}>
                      No documents uploaded yet. Add files below.
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div className="doc-row" key={doc.id}>
                        <i className="ti ti-file-text"></i>
                        <span className="doc-name">{doc.original_filename}</span>
                        <span className="doc-meta">
                          {(doc.file_size_bytes / (1024 * 1024)).toFixed(2)} MB · Aug 5, 2026
                        </span>
                        <span className="doc-status">
                          {doc.status === 'READY_FOR_RAG' ? (
                            <><i className="ti ti-check"></i>Ready</>
                          ) : doc.status === 'FAILED' ? (
                            <span style={{ color: 'var(--danger)' }}><i className="ti ti-x"></i>Failed</span>
                          ) : (
                            <span style={{ color: '#f59e0b' }}><i className="ti ti-clock"></i>Processing</span>
                          )}
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
            <div className="summary-head">
              <div className="summary-head-l">
                <div className="summary-icon"><i className="ti ti-sparkles"></i></div>
                <div>
                  <h2>Distributed system architecture and system design fundamentals</h2>
                  <p>Synthesized from workspace documents</p>
                </div>
              </div>
              <button className="btn"><i className="ti ti-refresh"></i>Regenerate</button>
            </div>

            <div className="prose">
              <h3>Introduction</h3>
              <p>System design and distributed systems architecture form the foundation of modern, large-scale software engineering. Applications must serve millions of concurrent users, handle petabytes of data, and guarantee continuous availability, which traditional monolithic implementations cannot support.</p>
              <hr />
              <h3>Executive overview</h3>
              <h4>1. Microservices and architectural paradigms</h4>
              <p>Distributed systems have evolved from monolithic structures to service-oriented architectures and microservices. A monolithic application encapsulates all business logic, data access, and UI rendering in a single deployable artifact.</p>
            </div>
          </section>
        )}

        {/* ============ TAB 3: LEARNING PATH ============ */}
        {activeTab === 'learning' && (
          <section className="tab-panel active" id="panel-learning">
            <div className="lp-layout">
              <div>
                <div className="section-label"><i className="ti ti-list-details"></i>Curriculum units (45)</div>
                <div className="curriculum">
                  <div className="unit active">
                    <div className="unit-num">01</div>
                    <div><div className="unit-title">Distributed system architecture and system design fundamentals</div><div className="unit-meta">Intermediate · 480 min</div></div>
                  </div>
                  <div className="unit">
                    <div className="unit-num">02</div>
                    <div><div className="unit-title">Architectural paradigms and domain-driven design</div><div class="unit-meta">Beginner · 60 min</div></div>
                  </div>
                </div>
              </div>

              <div className="lp-panel">
                <div className="lp-tabs">
                  <button className="lp-tab active"><i className="ti ti-file-description"></i>Unit summary</button>
                  <button className="lp-tab"><i className="ti ti-cards"></i>Flashcards (4)</button>
                  <button className="lp-tab"><i className="ti ti-help-octagon"></i>Self-quiz</button>
                </div>
                <div className="lp-body">
                  <div className="prose">
                    <h3>Unit overview</h3>
                    <p>Distributed system architecture and system design fundamentals focus on building scalable, resilient, and high-performance software systems.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============ TAB 4: RAG ASSISTANT ============ */}
        {activeTab === 'rag' && (
          <section className="tab-panel active" id="panel-rag">
            <div className="rag-wrap">
              <div className="rag-thread">
                <div className="msg-bot">
                  <div className="msg-avatar bot"><i className="ti ti-message-circle"></i></div>
                  <div className="bubble">
                    <h4>Definition of system design</h4>
                    <p>System design is the process of defining the architecture, modules, interfaces, and data structures for a system to satisfy specified technical and business requirements.</p>
                  </div>
                </div>
              </div>
              <div className="rag-input">
                <input type="text" placeholder="Ask a question about your workspace documents..." />
                <button className="btn btn-primary"><i className="ti ti-send"></i>Send</button>
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

    </AppLayout>
  );
};




