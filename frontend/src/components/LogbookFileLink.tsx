import { useState, type AnchorHTMLAttributes, type MouseEvent } from 'react';
const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export default function LogbookFileLink({ href = '', children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const [error, setError] = useState('');
  const managed = /^\/(?:private-uploads|uploads)\//.test(href) || (() => {
    try { const url = new URL(href); return (url.origin === new URL(api).origin && /^\/(?:private-uploads|uploads)\//.test(url.pathname)) || (url.protocol === 'https:' && url.hostname.endsWith('.amazonaws.com') && /^\/(?:private-uploads|uploads)\//.test(url.pathname)); } catch { return false; }
  })();
  async function open(event: MouseEvent<HTMLAnchorElement>) {
    if (!managed) return;
    event.preventDefault(); setError('');
    const preview = window.open('about:blank', '_blank'); if (preview) preview.opener = null;
    try {
      let stored = href;
      try { const url = new URL(href); if (url.origin === new URL(api).origin) stored = url.pathname; } catch { /* relative file */ }
      const response = await fetch(`${api}/api/logbook-files/content?url=${encodeURIComponent(stored)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
      if (!response.ok) throw new Error('Unable to open this attachment. Check your access or sign in again.');
      const blob = URL.createObjectURL(await response.blob());
      if (preview) preview.location.href = blob; else { const link = document.createElement('a'); link.href = blob; link.download = ''; link.click(); }
      setTimeout(() => URL.revokeObjectURL(blob), 300000);
    } catch (reason) { preview?.close(); setError(reason instanceof Error ? reason.message : 'Unable to open file.'); }
  }
  return <><a {...props} href={managed || /^https?:\/\//i.test(href) ? href : undefined} onClick={open} rel="noopener noreferrer">{children}</a>{error && <span role="alert" className="text-xs text-red-600">{error}</span>}</>;
}
