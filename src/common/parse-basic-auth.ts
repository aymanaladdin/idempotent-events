export function parseBasicAuth(header: string | undefined): { user: string; password: string } | null {
  if (!header?.startsWith('Basic ')) return null;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf-8');
  const [user, ...rest] = decoded.split(':');
  return { user, password: rest.join(':') };
}
