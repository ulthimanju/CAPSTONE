import React from 'react';
import { useSessions } from '../hooks/useSessions';
import { Card } from '../components/ui/Card';
import { Typography } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';

export const SessionsPage = () => {
  const { sessions, loading, revokeSession } = useSessions();

  if (loading) return <Spinner />;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Typography variant="h4" style={{ marginBottom: 'var(--space-6)' }}>Active Sessions</Typography>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {sessions.map((session) => (
          <Card key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)' }}>
            <div>
              <Typography variant="subtitle1">{session.device || 'Unknown Device'}</Typography>
              <Typography variant="body2" color="secondary">
                IP: {session.ip_address || 'N/A'} | Last active: {new Date(session.last_activity).toLocaleString()}
              </Typography>
            </div>
            <Button variant="danger" size="sm" onClick={() => revokeSession(session.id)}>
              Revoke
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
