import React from 'react';

export const Shimmer = ({ style, className = '' }) => (
  <div
    className={`skeleton-shimmer ${className}`}
    style={style}
  />
);

export const DocumentListSkeleton = ({ count = 4 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2-5)' }}>
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="doc-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3-5)',
          padding: 'var(--space-3-5) var(--space-4)',
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <Shimmer style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1-5)' }}>
          <Shimmer style={{ width: `${Math.floor(40 + Math.random() * 40)}%`, height: '14px' }} />
          <Shimmer style={{ width: '120px', height: '11px' }} />
        </div>
        <Shimmer style={{ width: '70px', height: '22px', borderRadius: 'var(--radius-lg)' }} />
        <Shimmer style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)' }} />
      </div>
    ))}
  </div>
);

export const SummarySkeleton = () => (
  <div className="island" style={{ padding: 'var(--space-6-5) var(--space-7)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <Shimmer style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-lg)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1-5)' }}>
          <Shimmer style={{ width: '220px', height: '18px' }} />
          <Shimmer style={{ width: '140px', height: '12px' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Shimmer style={{ width: '80px', height: '32px', borderRadius: 'var(--radius-sm)' }} />
        <Shimmer style={{ width: '110px', height: '32px', borderRadius: 'var(--radius-sm)' }} />
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2-5)' }}>
      <Shimmer style={{ width: '100%', height: '14px' }} />
      <Shimmer style={{ width: '94%', height: '14px' }} />
      <Shimmer style={{ width: '97%', height: '14px' }} />
      <Shimmer style={{ width: '60%', height: '14px' }} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2-5)' }}>
          <Shimmer style={{ width: '50%', height: '15px' }} />
          <Shimmer style={{ width: '100%', height: '12px' }} />
          <Shimmer style={{ width: '85%', height: '12px' }} />
        </div>
      ))}
    </div>
  </div>
);

export const LearningPathSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
    <div className="island" style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <Shimmer style={{ width: '200px', height: '20px' }} />
        <Shimmer style={{ width: '300px', height: '12px' }} />
      </div>
      <Shimmer style={{ width: '120px', height: '36px', borderRadius: 'var(--radius-md)' }} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="island" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Shimmer style={{ width: '60px', height: '20px', borderRadius: 'var(--radius-lg)' }} />
            <Shimmer style={{ width: '80px', height: '12px' }} />
          </div>
          <Shimmer style={{ width: '80%', height: '18px' }} />
          <Shimmer style={{ width: '100%', height: '12px' }} />
          <Shimmer style={{ width: '90%', height: '12px' }} />
          <Shimmer style={{ width: '100%', height: '36px', borderRadius: 'var(--radius-md)', marginTop: 'var(--space-2)' }} />
        </div>
      ))}
    </div>
  </div>
);

export const WorkspaceDashboardSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-6)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3-5)' }}>
        <Shimmer style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <Shimmer style={{ width: '220px', height: '22px' }} />
          <Shimmer style={{ width: '140px', height: '13px' }} />
        </div>
      </div>
      <Shimmer style={{ width: '140px', height: '38px', borderRadius: 'var(--radius-md)' }} />
    </div>
    <DocumentListSkeleton count={4} />
  </div>
);
