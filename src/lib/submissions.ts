export interface BackendConfig {
  url: string;
  anonKey: string;
}

export interface Project {
  id: string;
  projectUsername: string;
  twitterUsername: string;
  contract: string;
  description: string;
  wallet: string;
  createdAt: string;
}

export interface ProjectInput {
  twitterUsername: string;
  projectUsername: string;
  contract: string;
  description: string;
  wallet: string;
}

const selection = 'id,projectUsername:project_username,twitterUsername:twitter_username,contract,description,wallet,createdAt:created_at';

function baseUrl(config: BackendConfig): string {
  const url = new URL(config.url);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('The public directory requires an HTTPS backend URL.');
  }
  if (!config.anonKey.trim()) throw new Error('The public directory is not configured yet.');
  return config.url.replace(/\/+$/, '');
}

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return ['id', 'projectUsername', 'twitterUsername', 'contract', 'description', 'wallet', 'createdAt']
    .every((key) => typeof row[key] === 'string');
}

async function request(url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new Error('We could not reach the public directory. Check your connection and try again.');
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
      ? body.error
      : response.status === 401 || response.status === 403
        ? 'Publishing is unavailable. Please try again later.'
        : 'The public directory is temporarily unavailable. Please try again.';
    throw new Error(message);
  }
  return body;
}

/** All persisted public submissions, read without signing in. */
export async function fetchProjects(config: BackendConfig): Promise<Project[]> {
  const base = baseUrl(config);
  const projects: Project[] = [];
  const pageSize = 250;
  // Pages avoid Supabase's default maximum response row count.
  for (let offset = 0; ; offset += pageSize) {
    const query = new URLSearchParams({ select: selection, order: 'created_at.desc,id.desc', limit: String(pageSize), offset: String(offset) });
    const body = await request(`${base}/rest/v1/projects?${query}`, {
      headers: { apikey: config.anonKey, Accept: 'application/json' },
    });
    if (!Array.isArray(body) || !body.every(isProject)) throw new Error('The directory returned an unexpected response. Please try again.');
    projects.push(...body);
    if (body.length < pageSize) return [...new Map(projects.map((project) => [project.id, project])).values()];
  }
}

/** Project details and the optional personal Twitter are self-reported; no account sign-in is required. */
export async function submitProject(config: BackendConfig, input: ProjectInput): Promise<Project> {
  const body = await request(`${baseUrl(config)}/functions/v1/submit-project`, {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!isProject(body)) throw new Error('The server response was incomplete. Refresh the directory before trying again.');
  return body;
}
