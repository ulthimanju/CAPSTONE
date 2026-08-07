import React from 'react';

export const Shimmer = ({ style, className = '' }) => (
  <div
    className={`skeleton-shimmer ${className}`}
    style={{
      background: 'linear-gradient(90deg, #1c1c21 25%, #2a2a32 50%, #1c1c21 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-wave 1.5s infinite linear',
      borderRadius: '6px',
      ...style,
    }}
  />
);

export const DocumentListSkeleton = ({ count = 4 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="doc-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '14px 16px',
          background: 'var(--bg-2, #141417)',
          border: '1px solid var(--border-soft, #222226)',
          borderRadius: '10px',
        }}
      >
        <Shimmer style={{ width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Shimmer style={{ width: `${Math.floor(40 + Math.random() * 40)}%`, height: '14px' }} />
          <Shimmer style={{ width: '120px', height: '11px' }} />
        </div>
        <Shimmer style={{ width: '70px', height: '22px', borderRadius: '12px' }} />
        <Shimmer style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
      </div>
    ))}
  </div>
);

export const SummarySkeleton = () => (
  <div className="island" style={{ padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #222226', paddingBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Shimmer style={{ width: '36px', height: '36px', borderRadius: '10px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Shimmer style={{ width: '220px', height: '18px' }} />
          <Shimmer style={{ width: '140px', height: '12px' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Shimmer style={{ width: '80px', height: '32px', borderRadius: '6px' }} />
        <Shimmer style={{ width: '110px', height: '32px', borderRadius: '6px' }} />
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <Shimmer style={{ width: '100%', height: '14px' }} />
      <Shimmer style={{ width: '94%', height: '14px' }} />
      <Shimmer style={{ width: '97%', height: '14px' }} />
      <Shimmer style={{ width: '60%', height: '14px' }} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '8px' }}>
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} style={{ background: '#0c0c0e', border: '1px solid #222226', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Shimmer style={{ width: '50%', height: '15px' }} />
          <Shimmer style={{ width: '100%', height: '12px' }} />
          <Shimmer style={{ width: '85%', height: '12px' }} />
        </div>
      ))}
    </div>
  </div>
);

export const LearningPathSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <div className="island" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Shimmer style={{ width: '200px', height: '20px' }} />
        <Shimmer style={{ width: '300px', height: '12px' }} />
      </div>
      <Shimmer style={{ width: '120px', height: '36px', borderRadius: '8px' }} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="island" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Shimmer style={{ width: '60px', height: '20px', borderRadius: '12px' }} />
            <Shimmer style={{ width: '80px', height: '12px' }} />
          </div>
          <Shimmer style={{ width: '80%', height: '18px' }} />
          <Shimmer style={{ width: '100%', height: '12px' }} />
          <Shimmer style={{ width: '90%', height: '12px' }} />
          <Shimmer style={{ width: '100%', height: '36px', borderRadius: '8px', marginTop: '8px' }} />
        </div>
      ))}
    </div>
  </div>
);

export const WorkspaceDashboardSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Shimmer style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Shimmer style={{ width: '220px', height: '22px' }} />
          <Shimmer style={{ width: '140px', height: '13px' }} />
        </div>
      </div>
      <Shimmer style={{ width: '140px', height: '38px', borderRadius: '8px' }} />
    </div>
    <DocumentListSkeleton count={4} />
  </div>
);
