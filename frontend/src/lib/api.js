const BASE = ''; // same origin (served by backend) or proxied in dev

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  scan: (image, mimeType) => post('/api/scan', { image, mimeType }),
  stackCheck: (drugs) => post('/api/stack-check', { drugs }),
  interaction: (drugA, drugB) => post('/api/interaction', { drugA, drugB }),
  health: () => fetch(`${BASE}/api/health`).then((r) => r.json()),
};
