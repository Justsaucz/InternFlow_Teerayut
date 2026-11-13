// Translate storage paths at the API boundary; database keys stay relative.
const filePath = /^\/(?:private-uploads|uploads)\/[a-zA-Z0-9_.-]+$/;

export function browserFileUrl(value: string): string {
  if (!filePath.test(value) || !process.env.API_PUBLIC_URL) return value;
  try {
    const base = new URL(process.env.API_PUBLIC_URL);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) return value;
    return new URL(value, base.origin).href;
  } catch { return value; }
}

export function browserAttachments(value: string | null): string | null {
  if (!value) return value;
  try {
    const entries = JSON.parse(value);
    if (Array.isArray(entries)) return JSON.stringify(entries.map(entry =>
      typeof entry === 'string' ? browserFileUrl(entry) :
      entry && typeof entry.url === 'string' ? { ...entry, url: browserFileUrl(entry.url) } : entry
    ));
  } catch { /* Legacy plain or newline-separated URLs. */ }
  return value.split('\n').map(browserFileUrl).join('\n');
}
