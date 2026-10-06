import { createHandler, HttpError, type Input } from './core.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const origins = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
async function insert(input: Input): Promise<unknown> {
  if (!supabaseUrl || !serviceKey || !origins.length) {
    throw new HttpError(503, 'Publishing is not configured yet. Please try again later.');
  }
  const select = 'id,projectUsername:project_username,twitterUsername:twitter_username,contract,description,createdAt:created_at';
  const response = await fetch(`${supabaseUrl}/rest/v1/projects?select=${encodeURIComponent(select)}`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ project_username: input.projectUsername, twitter_username: input.twitterUsername, contract: input.contract, description: input.description }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (body?.code === '23505') throw new HttpError(409, 'This contract is already in the public directory. Search for its address to find the submission.');
    throw new HttpError(503, 'We could not save your project. Please try again.');
  }
  if (!Array.isArray(body) || !body[0]) throw new HttpError(503, 'The server response was incomplete. Refresh the directory before trying again.');
  return body[0];
}

Deno.serve(createHandler({ origins, insert }));
