export interface Input {
  projectUsername: string;
  contract: string;
  description: string;
  wallet: string;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function validateInput(value: unknown): Input {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Enter the four project details.');
  const raw = value as Record<string, unknown>;
  const input = {
    projectUsername: typeof raw.projectUsername === 'string' ? raw.projectUsername.trim().replace(/^@/, '') : '',
    contract: typeof raw.contract === 'string' ? raw.contract.trim().toLowerCase() : '',
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    wallet: typeof raw.wallet === 'string' ? raw.wallet.trim() : '',
  };
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(input.projectUsername)) throw new HttpError(400, 'Use 3–32 letters, numbers, underscores or hyphens for your project username.');
  for (const field of ['contract', 'wallet'] as const) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(input[field]) || /^0x0{40}$/i.test(input[field])) {
      throw new HttpError(400, `Enter a valid, nonzero EVM ${field} address (0x and 40 hexadecimal characters).`);
    }
  }
  if (input.description.length < 20 || input.description.length > 1000) throw new HttpError(400, 'Describe your project in 20–1,000 characters.');
  return input;
}

interface Services {
  origins: string[];
  authenticate: (token: string) => Promise<string>;
  insert: (input: Input, twitterUsername: string) => Promise<unknown>;
}

async function readJson(req: Request): Promise<unknown> {
  // Bound the actual stream as Content-Length can be omitted or forged.
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, 'Enter your project details.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.byteLength;
    if (length > 16_384) {
      await reader.cancel();
      throw new HttpError(413, 'Your submission is too long. Keep the description under 1,000 characters.');
    }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new HttpError(400, 'The submission could not be read. Please try again.'); }
}

export function createHandler(services: Services) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('Origin');
    const allowed = origin !== null && services.origins.includes(origin);
    const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' });
    if (allowed) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type');
      headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    }
    const json = (value: unknown, status: number) => new Response(JSON.stringify(value), { status, headers });
    if (origin && !allowed) return json({ error: 'This website origin is not enabled for submissions.' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') { headers.set('Allow', 'POST, OPTIONS'); return json({ error: 'Use the project submission form to publish.' }, 405); }
    try {
      const auth = req.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/i);
      if (!auth || auth[1].length > 8192) throw new HttpError(401, 'Sign in with Twitter before publishing your project.');
      if (!req.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'Send project details as JSON.');
      const input = validateInput(await readJson(req));
      const twitterUsername = await services.authenticate(auth[1]);
      const project = await services.insert(input, twitterUsername);
      return json(project, 201);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      return json({ error: 'Publishing is temporarily unavailable. Please try again.' }, 503);
    }
  };
}
