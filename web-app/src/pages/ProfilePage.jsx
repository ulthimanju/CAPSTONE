import React, { useState } from 'react';
import { useProfile } from '../hooks/useProfile';
import { Card } from '../components/ui/Card';
import { Typography } from '../components/ui/Typography';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';

export const ProfilePage = () => {
  const { user, loading, updateProfile } = useProfile();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  if (loading && !user) return <Spinner />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
        <Avatar src={user?.picture_url} name={user?.name || user?.email} size="lg" />
        <div>
          <Typography variant="h5">{user?.name}</Typography>
          <Typography variant="body2" color="secondary">{user?.email}</Typography>
        </div>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
        />
        <Button variant="primary" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </form>
    </Card>
  );
};
