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
  projectUsername: string;
  contract: string;
  description: string;
  wallet: string;
}

const selection = 'id,projectUsername:project_username,twitterUsername:twitter_username,contract,description,wallet,createdAt:created_at';

export function validateProject(input: ProjectInput): Partial<Record<keyof ProjectInput, string>> {
  const errors: Partial<Record<keyof ProjectInput, string>> = {};
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(input.projectUsername.trim().replace(/^@/, ''))) errors.projectUsername = 'Use 3–32 letters, numbers, underscores or hyphens.';
  for (const field of ['contract', 'wallet'] as const) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(input[field].trim()) || /^0x0{40}$/i.test(input[field].trim())) {
      errors[field] = `Enter a nonzero EVM ${field} address: 0x followed by 40 hexadecimal characters.`;
    }
  }
  if (input.description.trim().length < 20 || input.description.trim().length > 1000) errors.description = 'Describe your project in 20–1,000 characters.';
  return errors;
}

function baseUrl(config: BackendConfig): string {
  const url = new URL(config.url);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('Submissions require an HTTPS backend URL.');
  }
  if (!config.anonKey.trim()) throw new Error('Submissions are not configured yet.');
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
    throw new Error('Unable to reach the submission service. Check your connection and try again.');
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
      ? body.error
      : response.status === 401 || response.status === 403
        ? 'Your Twitter verification could not be confirmed. Verify with Twitter again.'
        : 'Submissions are temporarily unavailable. Please try again.';
    throw new Error(message);
  }
  return body;
}

/** All persisted public submissions. Reading needs no Twitter verification: every submission is public. */
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
    if (!Array.isArray(body) || !body.every(isProject)) throw new Error('The submission service returned an unexpected response. Please try again.');
    projects.push(...body);
    if (body.length < pageSize) return [...new Map(projects.map((project) => [project.id, project])).values()];
  }
}

/** Twitter identity is deliberately absent from input; the server derives it from the verified session. */
export async function submitProject(config: BackendConfig, input: ProjectInput, accessToken: string): Promise<Project> {
  if (!accessToken) throw new Error('Verify with Twitter before submitting your project.');
  const body = await request(`${baseUrl(config)}/functions/v1/submit-project`, {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!isProject(body)) throw new Error('The server response was incomplete. Please try again.');
  return body;
}
