import React from 'react';
import { useAuth } from '../hooks/useAuth';

export const AppLayout = ({ children, activeTab, setActiveTab, docCount = 3 }) => {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      {/* ============ LEFT NAV ============ */}
      <nav className="nav">
        <div className="nav-header">
          <div className="nav-mark">S</div>
          <div className="nav-title">
            SYNAPSE
          </div>
        </div>

        <div className="nav-body">
          <div className="nav-label">Workspace</div>
          
          <button
            className={`nav-item ${activeTab === 'documents' || !activeTab ? 'active' : ''}`}
            onClick={() => setActiveTab && setActiveTab('documents')}
          >
            <i className="ti ti-file-text"></i>Documents<span className="count">{docCount}</span>

          </button>
          
          <button
            className={`nav-item ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab && setActiveTab('summary')}
          >
            <i className="ti ti-sparkles"></i>AI summary
          </button>

          <button
            className={`nav-item ${activeTab === 'learning' ? 'active' : ''}`}
            onClick={() => setActiveTab && setActiveTab('learning')}
          >
            <i className="ti ti-route"></i>Learning path
          </button>

          <button
            className={`nav-item ${activeTab === 'rag' ? 'active' : ''}`}
            onClick={() => setActiveTab && setActiveTab('rag')}
          >
            <i className="ti ti-message-circle"></i>RAG assistant
          </button>

          <button
            className={`nav-item ${activeTab === 'collab' ? 'active' : ''}`}
            onClick={() => setActiveTab && setActiveTab('collab')}
          >
            <i className="ti ti-users"></i>Collaborators<span class="count">1</span>
          </button>
        </div>

        <div className="nav-footer">
          <div className="avatar-sm">
            {user?.email ? user.email.substring(0, 2).toUpperCase() : 'UM'}
          </div>
          <span>Account</span>
          <i className="ti ti-logout" onClick={logout} style={{ cursor: 'pointer' }} title="Logout"></i>
        </div>
      </nav>

      {/* ============ MAIN AREA ============ */}
      <div className="main">
        {children}
      </div>
    </div>
  );
};



