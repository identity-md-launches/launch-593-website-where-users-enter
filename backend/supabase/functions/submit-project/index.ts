import { createHandler, HttpError, type Input } from './core.ts';

// Supabase supplies SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY to hosted Edge Functions.
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const origins = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);

interface AuthUser {
  id?: string;
  identities?: { provider?: string; identity_data?: Record<string, unknown> }[];
}

async function authenticate(token: string): Promise<string> {
  if (!supabaseUrl || !anonKey || !serviceKey || !origins.length) {
    throw new HttpError(503, 'Submissions are not configured yet. Please try again later.');
  }
  // Supabase Auth checks the caller's token (signature, expiry, revocation) and returns the user it belongs to,
  // including the Twitter identity it stored during OAuth. Nothing from the request body identifies the user.
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401 || response.status === 403) throw new HttpError(401, 'Your Twitter verification expired or could not be confirmed. Verify with Twitter again.');
  if (!response.ok) throw new HttpError(503, 'Twitter verification is temporarily unavailable. Please try again.');
  const user = await response.json().catch(() => null) as AuthUser | null;
  if (!user || typeof user.id !== 'string') throw new HttpError(401, 'Your Twitter verification could not be confirmed. Verify with Twitter again.');
  const identity = Array.isArray(user.identities) ? user.identities.find((item) => item?.provider === 'twitter') : undefined;
  const data = identity?.identity_data ?? {};
  const handle = [data.user_name, data.preferred_username].find((value) => typeof value === 'string') as string | undefined;
  if (!handle || !/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    throw new HttpError(403, 'Verify a Twitter account before submitting a project.');
  }
  return handle;
}

async function insert(input: Input, twitterUsername: string): Promise<unknown> {
  const select = 'id,projectUsername:project_username,twitterUsername:twitter_username,contract,description,wallet,createdAt:created_at';
  const response = await fetch(`${supabaseUrl}/rest/v1/projects?select=${encodeURIComponent(select)}`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ project_username: input.projectUsername, twitter_username: twitterUsername, contract: input.contract, description: input.description, wallet: input.wallet }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (body?.code === '23505') throw new HttpError(409, 'This contract has already been submitted. Each contract can be listed once.');
    throw new HttpError(503, 'Unable to save your project. Please try again.');
  }
  if (!Array.isArray(body) || !body[0]) throw new HttpError(503, 'The server response was incomplete. Please try again.');
  return body[0];
}

Deno.serve(createHandler({ origins, authenticate, insert }));
