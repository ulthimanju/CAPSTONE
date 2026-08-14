import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function CopyPayloadButton({ payload }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!payload) return;
    try {
      const textToCopy = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy payload:', err);
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleCopy}
      disabled={!payload || copied}
      style={{ minWidth: '100px' }}
    >
      {copied ? 'Copied! ✓' : 'Copy Payload'}
    </Button>
  );
}
