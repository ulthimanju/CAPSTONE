import { describe, it, expect } from 'vitest';
import { getSafeInternalRedirect } from '@/lib/navigation';
import { ROUTES } from '@/config/constants';

describe('Deep-Link & Open Redirect Prevention (getSafeInternalRedirect)', () => {
  it('allows valid internal paths', () => {
    expect(getSafeInternalRedirect('/workspaces/123')).toBe('/workspaces/123');
    expect(getSafeInternalRedirect('/workspaces/123?tab=documents')).toBe('/workspaces/123?tab=documents');
    expect(getSafeInternalRedirect('/settings')).toBe('/settings');
  });

  it('correctly handles React Router location objects', () => {
    const locationObj = {
      pathname: '/workspaces/123/chat',
      search: '?query=testing',
      hash: '#section1',
    };
    expect(getSafeInternalRedirect(locationObj)).toBe('/workspaces/123/chat?query=testing#section1');
  });

  it('rejects external absolute URLs and falls back to default', () => {
    expect(getSafeInternalRedirect('https://malicious-site.example')).toBe(ROUTES.WORKSPACES);
    expect(getSafeInternalRedirect('http://evil.com/phishing')).toBe(ROUTES.WORKSPACES);
    expect(getSafeInternalRedirect('ftp://evil.com')).toBe(ROUTES.WORKSPACES);
  });

  it('rejects protocol-relative URLs (//malicious.com)', () => {
    expect(getSafeInternalRedirect('//malicious.com/attack')).toBe(ROUTES.WORKSPACES);
    expect(getSafeInternalRedirect('///evil.com')).toBe(ROUTES.WORKSPACES);
  });

  it('rejects backslash bypass attempts (/\\evil.com or \\\\evil.com)', () => {
    expect(getSafeInternalRedirect('/\\evil.com')).toBe(ROUTES.WORKSPACES);
    expect(getSafeInternalRedirect('\\evil.com')).toBe(ROUTES.WORKSPACES);
    expect(getSafeInternalRedirect('/workspaces\\evil.com')).toBe(ROUTES.WORKSPACES);
  });

  it('rejects javascript: and data: pseudo-protocol URIs (XSS)', () => {
    expect(getSafeInternalRedirect('javascript:alert(document.cookie)')).toBe(ROUTES.WORKSPACES);
    expect(getSafeInternalRedirect('data:text/html,<script>alert(1)</script>')).toBe(ROUTES.WORKSPACES);
    expect(getSafeInternalRedirect('/javascript:alert(1)')).toBe(ROUTES.WORKSPACES);
    expect(getSafeInternalRedirect('/https:evil.com')).toBe(ROUTES.WORKSPACES);
  });

  it('handles empty, null, undefined or malformed inputs cleanly', () => {
    expect(getSafeInternalRedirect(null)).toBe(ROUTES.WORKSPACES);
    expect(getSafeInternalRedirect(undefined)).toBe(ROUTES.WORKSPACES);
    expect(getSafeInternalRedirect('')).toBe(ROUTES.WORKSPACES);
    expect(getSafeInternalRedirect(12345)).toBe(ROUTES.WORKSPACES);
    expect(getSafeInternalRedirect({})).toBe(ROUTES.WORKSPACES);
  });
});
