import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';

export const WorkspaceDetailPage = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState(null);
  const [allWorkspaces, setAllWorkspaces] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Markdown viewer modal
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [markdownContent, setMarkdownContent] = useState('');
  const [loadingMarkdown, setLoadingMarkdown] = useState(false);

  // Chunks viewer modal
  const [selectedDocChunks, setSelectedDocChunks] = useState(null);
  const [chunksList, setChunksList] = useState([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  // Uploading state
  const [selectedFiles, setSelectedFiles] = useState([]);

  const fetchWorkspaceAndDocs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};

      const [wsRes, allWsRes, docsRes] = await Promise.all([
        axios.get(`/api/v1/workspaces/${workspaceId}`, { headers }),
        axios.get('/api/v1/workspaces', { headers }),
        axios.get(`/api/v1/documents?workspace_id=${workspaceId}`, { headers }),
      ]);

      setWorkspace(wsRes.data);
      setAllWorkspaces(allWsRes.data.workspaces || []);
      setDocuments(docsRes.data.documents || []);
    } catch (err) {
      console.error('Failed to load workspace detail:', err);
      if (!silent) setError('Unable to load workspace details.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceAndDocs();
  }, [workspaceId]);

  // Polling loop: automatically poll every 2s until all documents reach a final state (READY_FOR_RAG or FAILED)
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

  // Compute ready vs processing counts
  const readyCount = documents.filter((d) => d.status === 'READY_FOR_RAG').length;
  const processingCount = documents.filter(
    (d) => d.status !== 'READY_FOR_RAG' && d.status !== 'FAILED'
  ).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ padding: '2rem', backgroundColor: '#180a0a', border: '1px solid #7f1d1d', borderRadius: '8px', color: '#fca5a5' }}>
          {error || 'Workspace not found.'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#090a0f' }}>
      {/* Top Header Bar */}
      <header
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          padding: '0.85rem 2rem',
          backgroundColor: '#07080c',
          borderBottom: '1px solid #16181d',
        }}
      >
        {/* Left: Workspace Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <select
              value={workspaceId}
              onChange={(e) => navigate(`/workspaces/${e.target.value}`)}
              style={{
                appearance: 'none',
                backgroundColor: '#111319',
                border: '1px solid #222530',
                borderRadius: '6px',
                padding: '0.4rem 2.2rem 0.4rem 2.2rem',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {allWorkspaces.map((ws) => (
                <option key={ws.id} value={ws.id} style={{ backgroundColor: '#111319', color: '#fff' }}>
                  {ws.name}
                </option>
              ))}
            </select>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', color: '#10b981' }}>
              📁
            </span>
            <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#6b7280', pointerEvents: 'none' }}>
              ▼
            </span>
          </div>
        </div>

        {/* Center: Title and Metric Counters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem' }}>
          <span style={{ color: '#ffffff', fontWeight: '600' }}>Documents</span>
          <span style={{ color: '#6b7280' }}>·</span>
          <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
            {readyCount} ready · {processingCount} processing
          </span>
        </div>

        {/* Right: Upload Button */}
        <div>
          <label
            htmlFor="header-file-input"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#10b981',
              color: '#000000',
              fontWeight: '600',
              fontSize: '0.85rem',
              padding: '0.45rem 1.1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <span>↑</span> Upload
          </label>
          <input
            id="header-file-input"
            type="file"
            multiple
            onChange={(e) => handleUploadFiles(e.target.files)}
            style={{ display: 'none' }}
          />
        </div>
      </header>

      {/* Main Workspace Body Content */}
      <main style={{ flex: 1, padding: '2rem 3rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        {/* Workspace Documents List Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>📁</span>
          <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em' }}>
            WORKSPACE DOCUMENTS
          </span>
        </div>

        {/* Workspace Documents Table Container */}
        <div
          style={{
            backgroundColor: '#0c0e14',
            border: '1px solid #191c26',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '2.5rem',
          }}
        >
          {documents.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              No documents in workspace yet. Upload files below to get started.
            </div>
          ) : (
            <div>
              {documents.map((doc, idx) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '0.9rem 1.25rem',
                    borderBottom: idx !== documents.length - 1 ? '1px solid #161822' : 'none',
                    backgroundColor: idx % 2 === 0 ? '#0c0e14' : '#0a0b10',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {/* Left: Document Icon & Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                    <span style={{ color: '#6b7280', fontSize: '1rem' }}>📄</span>
                    <span style={{ color: '#f3f4f6', fontSize: '0.875rem', fontWeight: '500', truncate: 'true', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.original_filename}
                    </span>
                  </div>

                  {/* Right: Meta (Size, Date, Status, Action Icons) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexShrink: 0 }}>
                    {/* File Size */}
                    <span style={{ color: '#6b7280', fontSize: '0.8rem', width: '70px', textAlign: 'right' }}>
                      {(doc.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                    </span>

                    {/* Date */}
                    <span style={{ color: '#6b7280', fontSize: '0.8rem', width: '90px', textAlign: 'right' }}>
                      Aug 5, 2026
                    </span>

                    {/* Status Indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', width: '80px', justifyContent: 'flex-end' }}>
                      {doc.status === 'READY_FOR_RAG' ? (
                        <>
                          <span style={{ color: '#10b981', fontSize: '0.75rem' }}>✓</span>
                          <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: '500' }}>Ready</span>
                        </>
                      ) : doc.status === 'FAILED' ? (
                        <>
                          <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>✕</span>
                          <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: '500' }}>Failed</span>
                        </>
                      ) : (
                        <>
                          <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>⏳</span>
                          <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: '500' }}>Processing</span>
                        </>
                      )}
                    </div>

                    {/* Action Icon Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {doc.storage_metadata_json?.web_view_link && (
                        <a
                          href={doc.storage_metadata_json.web_view_link.replace(/\/(edit|view)(\?.*)?$/, '/preview')}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Preview File"
                          style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
                        >
                          👁
                        </a>
                      )}
                      {(doc.status === 'READY' || doc.status === 'READY_FOR_RAG') && (
                        <button
                          onClick={() => handleViewMarkdown(doc)}
                          title="View Markdown Text"
                          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                          📄
                        </button>
                      )}
                      {doc.status === 'READY_FOR_RAG' && (
                        <button
                          onClick={() => handleViewChunks(doc)}
                          title="View Chunks"
                          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                          🧩
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        title="Delete File"
                        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.9rem' }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drag and Drop Add Files Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>📄</span>
          <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em' }}>
            ADD FILES
          </span>
        </div>

        <label
          htmlFor="dropzone-file-input"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleUploadFiles(e.dataTransfer.files);
            }
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justify: 'center',
            padding: '3.5rem 2rem',
            backgroundColor: '#0b0d12',
            border: '1px dashed #1e2230',
            borderRadius: '10px',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'border-color 0.2s ease',
          }}
        >
          <div style={{ fontSize: '2rem', color: '#6b7280', marginBottom: '0.85rem' }}>
            ⇪
          </div>
          <div style={{ color: '#d1d5db', fontSize: '0.95rem', fontWeight: '500', marginBottom: '1.25rem' }}>
            Drag and drop files or Click to upload files
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', color: '#6b7280' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ color: '#10b981' }}>✓</span>
              <span>PDFs (scanned/OCR), Word, Excel, PPT</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ color: '#10b981' }}>✓</span>
              <span>Images (PNG, JPG, WebP), TXT, code</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ color: '#10b981' }}>✓</span>
              <span>Up to 50 MB per file</span>
            </div>
          </div>

          <input
            id="dropzone-file-input"
            type="file"
            multiple
            onChange={(e) => handleUploadFiles(e.target.files)}
            style={{ display: 'none' }}
          />
        </label>
      </main>

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

      {/* Chunks Viewer Modal */}
      <Modal open={Boolean(selectedDocChunks)} onOpenChange={() => setSelectedDocChunks(null)}>
        <ModalContent size="lg" className="bg-[#16161a] border border-[#2a2a2e] text-white shadow-2xl">
          <ModalHeader
            title={`Semantic Chunks (${chunksList.length})`}
            description={`Structured chunks for ${selectedDocChunks?.original_filename || 'document'}`}
          />
          <ModalBody className="py-4 space-y-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {loadingChunks ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <Spinner size="lg" />
              </div>
            ) : (
              chunksList.map((chunk) => (
                <div key={chunk.id} style={{ padding: '0.75rem 1rem', backgroundColor: '#0c0c0e', border: '1px solid #2a2a2e', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.75rem', color: '#a1a1aa' }}>
                    <span style={{ color: '#10b981', fontWeight: '600' }}>Chunk #{chunk.chunk_index} • {chunk.chunk_type}</span>
                    <span>Tokens: {chunk.token_count} | Chars: {chunk.character_count}</span>
                  </div>
                  {chunk.title && (
                    <div style={{ fontWeight: '600', color: '#f4f4f5', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                      Heading: {chunk.title}
                    </div>
                  )}
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem', color: '#d4d4d8', margin: 0 }}>
                    {chunk.content}
                  </pre>
                </div>
              ))
            )}
          </ModalBody>
          <ModalFooter className="pt-4 border-t border-[#2a2a2e]">
            <button
              onClick={() => setSelectedDocChunks(null)}
              style={{ backgroundColor: '#27272a', color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
            >
              Close
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

