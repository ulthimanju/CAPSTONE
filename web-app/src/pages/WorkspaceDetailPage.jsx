import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Typography } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';

export const WorkspaceDetailPage = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState(null);
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

  // Multi-File Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const fetchWorkspaceAndDocs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};

      const [wsRes, docsRes] = await Promise.all([
        axios.get(`/api/v1/workspaces/${workspaceId}`, { headers }),
        axios.get(`/api/v1/documents?workspace_id=${workspaceId}`, { headers }),
      ]);

      setWorkspace(wsRes.data);
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


  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUploadDocuments = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    // Immediately close modal and reset selected files so user sees cards directly
    const filesToUpload = [...selectedFiles];
    setSelectedFiles([]);
    setIsUploadOpen(false);

    const token = localStorage.getItem('access_token');
    const headers = {
      ...(user?.id ? { 'X-User-ID': user.id } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };

    // Run ingestion: Step 1 (Upload raw files) in parallel so ALL cards show immediately in UI
    (async () => {
      // Phase A: Concurrent Raw Upload (creates UPLOADED cards for all selected files at once)
      const uploadPromises = filesToUpload.map(async (file) => {
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

      // Phase B: Fire-and-Forget async background processing for each uploaded document
      uploadedResults.forEach(async (item) => {
        if (!item.doc) return;
        const createdDoc = item.doc;
        const filename = item.file.name;

        try {
          // Trigger Validate asynchronously (fire and forget, do not await blocking response)
          axios.post(`/api/v1/documents/${createdDoc.id}/validate`, {}, { headers })
            .then(() => axios.post(`/api/v1/documents/${createdDoc.id}/parse`, {}, { headers }))
            .then(() => axios.post(`/api/v1/documents/${createdDoc.id}/chunks`, {}, { headers }))
            .catch((err) => console.error(`Background ingestion error for ${filename}:`, err));
        } catch (fileErr) {
          console.error(`Error initiating background processing for ${filename}:`, fileErr);
        }
      });
    })();


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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <Button variant="secondary" onClick={() => navigate('/workspaces')} style={{ marginBottom: '1.5rem' }}>
          ← Back to Workspaces
        </Button>

        <div style={{ padding: '2rem', backgroundColor: '#2d1517', border: '1px solid #7f1d1d', borderRadius: '8px', color: '#fca5a5' }}>
          {error || 'Workspace not found.'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Button variant="secondary" size="sm" onClick={() => navigate('/workspaces')} style={{ marginBottom: '1.5rem' }}>
        ← Back to Workspaces
      </Button>

      {/* Workspace Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #2a2a2e' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <Typography variant="h4" style={{ fontWeight: '700', color: '#f4f4f5' }}>
              {workspace.name}
            </Typography>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              padding: '0.25rem 0.6rem',
              borderRadius: '4px',
              backgroundColor: workspace.visibility === 'PRIVATE' ? '#1e1b4b' : '#064e3b',
              color: workspace.visibility === 'PRIVATE' ? '#818cf8' : '#34d399',
            }}>
              {workspace.visibility}
            </span>
          </div>
          <Typography variant="body1" style={{ color: '#a1a1aa' }}>
            {workspace.description || 'No description provided for this workspace.'}
          </Typography>
        </div>

        <Button variant="primary" onClick={() => setIsUploadOpen(true)}>
          + Upload Documents
        </Button>
      </div>

      {/* Documents Section */}
      <div style={{ marginBottom: '1rem' }}>
        <Typography variant="h6" style={{ fontWeight: '600', color: '#f4f4f5', marginBottom: '1rem' }}>
          Workspace Documents ({documents.length})
        </Typography>

        {documents.length === 0 ? (
          <Card style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#16161a', border: '1px dashed #2a2a2e' }}>
            <Typography variant="h6" style={{ color: '#f4f4f5', marginBottom: '0.5rem' }}>
              No Documents in Workspace
            </Typography>
            <Typography variant="body2" style={{ color: '#a1a1aa', marginBottom: '1.5rem' }}>
              Upload single or multiple PDF, DOCX, or text documents to ingest them into this workspace.
            </Typography>
            <Button variant="primary" onClick={() => setIsUploadOpen(true)}>
              + Upload Documents
            </Button>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {documents.map((doc) => (
              <Card key={doc.id} style={{ padding: '1.25rem', backgroundColor: '#16161a', border: '1px solid #2a2a2e', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#27272a', color: '#3ecf8e' }}>
                      {doc.file_extension}
                    </span>

                    {/* Badges Container */}
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#1e1b4b', color: '#818cf8' }}>
                        v{doc.version || 1}
                      </span>

                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor:
                          doc.status === 'READY_FOR_RAG' ? '#064e3b' :
                          doc.status === 'CHUNKED' || doc.status === 'READY' ? '#1e1b4b' :
                          doc.status === 'PARSED' ? '#312e81' :
                          doc.status === 'VALIDATED' ? '#1e3a8a' :
                          doc.status === 'UPLOADED' ? '#0369a1' :
                          doc.status === 'PROCESSING' || doc.status === 'PROCESSED' ? '#78350f' : '#7f1d1d',
                        color:
                          doc.status === 'READY_FOR_RAG' ? '#34d399' :
                          doc.status === 'CHUNKED' || doc.status === 'READY' ? '#a5b4fc' :
                          doc.status === 'PARSED' ? '#818cf8' :
                          doc.status === 'VALIDATED' ? '#60a5fa' :
                          doc.status === 'UPLOADED' ? '#38bdf8' :
                          doc.status === 'PROCESSING' || doc.status === 'PROCESSED' ? '#fbbf24' : '#fca5a5',
                      }}>
                        {doc.status === 'PROCESSING' || doc.status === 'PROCESSED' ? 'PROCESSING...' : doc.status === 'FAILED' ? (doc.parse_error || 'Llama parser quota exceeded') : doc.status}
                      </span>

                      {/* Dedicated Embedding Status Badge */}
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: doc.status === 'READY_FOR_RAG' ? '#022c22' : '#18181b',
                        color: doc.status === 'READY_FOR_RAG' ? '#6ee7b7' : '#a1a1aa',
                        border: doc.status === 'READY_FOR_RAG' ? '1px solid #065f46' : '1px solid #27272a',
                      }}>
                        {doc.status === 'READY_FOR_RAG' ? '⚡ EMBEDDED' : '⏳ EMBEDDING PENDING'}
                      </span>
                    </div>
                  </div>

                  <Typography variant="subtitle1" style={{ fontWeight: '600', color: '#f4f4f5', wordBreak: 'break-word', marginBottom: '0.5rem' }}>
                    {doc.original_filename}
                  </Typography>

                  <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '1rem', spaceY: '0.25rem' }}>
                    <div>Size: <span style={{ color: '#e4e4e7' }}>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span></div>
                    <div>Chunks: <span style={{ color: '#3ecf8e', fontWeight: '600' }}>{doc.chunk_count || 0} semantic chunks</span></div>
                    <div>Vector Index: <span style={{ color: doc.status === 'READY_FOR_RAG' ? '#34d399' : '#fbbf24', fontWeight: '600' }}>{doc.status === 'READY_FOR_RAG' ? 'pgvector (3072d)' : 'Awaiting Ingestion'}</span></div>

                    {doc.checksum && (
                      <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        SHA-256: <span style={{ color: '#a1a1aa', fontFamily: 'monospace' }}>{doc.checksum.substring(0, 16)}...</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #27272a' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {doc.storage_metadata_json?.web_view_link && (
                      <a
                        href={doc.storage_metadata_json.web_view_link.replace(/\/(edit|view)(\?.*)?$/, '/preview')}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#3ecf8e', fontSize: '0.8rem', fontWeight: '500', textDecoration: 'none' }}
                      >
                        Drive ↗
                      </a>
                    )}


                    {(doc.status === 'READY' || doc.status === 'READY_FOR_RAG') && (
                      <Button variant="outline" size="xs" onClick={() => handleViewMarkdown(doc)}>
                        Text 📄
                      </Button>
                    )}
                    {doc.status === 'READY_FOR_RAG' && (
                      <Button variant="secondary" size="xs" onClick={() => handleViewChunks(doc)}>
                        Chunks ({doc.chunk_count}) 🧩
                      </Button>
                    )}
                  </div>

                  <Button variant="danger" size="sm" onClick={() => handleDeleteDocument(doc.id)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Multi-File Upload Modal */}
      <Modal open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <ModalContent size="md" className="bg-[#16161a] border border-[#2a2a2e] text-white shadow-2xl">
          <ModalHeader
            title="Upload Document Files"
            description="Select multiple files. Uploading closes modal immediately & live-updates document cards."
          />
          <form onSubmit={handleUploadDocuments}>
            <ModalBody className="space-y-4 py-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-200">
                  Select File(s) <span className="text-emerald-400">*</span>
                </label>
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#2a2a2e] hover:border-[#3ecf8e] rounded-xl bg-[#0c0c0e] transition-colors cursor-pointer text-center">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    required
                    className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#1e1b4b] file:text-[#818cf8] hover:file:bg-[#2e2a72] cursor-pointer"
                  />
                  {selectedFiles.length > 0 && (
                    <div className="mt-3 text-xs text-emerald-400 font-medium">
                      Selected {selectedFiles.length} file(s): {selectedFiles.map(f => f.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="gap-3 pt-4 border-t border-[#2a2a2e]">
              <Button type="button" variant="secondary" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={selectedFiles.length === 0}>
                Upload & Ingest ({selectedFiles.length})
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

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
            <Button variant="secondary" onClick={() => setSelectedDoc(null)}>
              Close
            </Button>
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
                    <span style={{ color: '#3ecf8e', fontWeight: '600' }}>Chunk #{chunk.chunk_index} • {chunk.chunk_type}</span>
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
            <Button variant="secondary" onClick={() => setSelectedDocChunks(null)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
