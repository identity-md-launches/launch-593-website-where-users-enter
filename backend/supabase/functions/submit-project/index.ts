import { importSPKI, jwtVerify } from 'npm:jose@6.2.12';
import { createHandler, HttpError, type Input } from './core.ts';

const appId = Deno.env.get('PRIVY_APP_ID') ?? '';
const appSecret = Deno.env.get('PRIVY_APP_SECRET') ?? '';
const publicKey = Deno.env.get('PRIVY_VERIFICATION_KEY')?.replace(/\\n/g, '\n') ?? '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const origins = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
let verificationKey: CryptoKey | undefined;

async function authenticate(token: string): Promise<string> {
  if (!appId || !appSecret || !publicKey || !supabaseUrl || !serviceKey || !origins.length) {
    throw new HttpError(503, 'Publishing is not configured yet. Please try again later.');
  }
  // Configuration errors remain 503; invalid caller tokens return 401.
  verificationKey ??= await importSPKI(publicKey, 'ES256');
  let userId: string;
  try {
    const { payload } = await jwtVerify(token, verificationKey, {
      algorithms: ['ES256'], issuer: 'privy.io', audience: appId,
      requiredClaims: ['sub', 'exp', 'iat'],
    });
    if (!payload.sub?.startsWith('did:privy:')) throw new Error('Missing Privy user');
    userId = payload.sub;
  } catch {
    throw new HttpError(401, 'Your session expired or could not be verified. Sign in with Twitter again.');
  }
  // Fetch the authenticated subject's current linked accounts. Never trust a
  // twitterUsername, user ID or verification flag from the request body.
  const response = await fetch(`https://api.privy.io/v1/users/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Basic ${btoa(`${appId}:${appSecret}`)}`, 'privy-app-id': appId },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404) throw new HttpError(401, 'This account is unavailable. Sign in with Twitter again.');
  if (!response.ok) throw new HttpError(503, 'Twitter verification is temporarily unavailable. Please try again.');
  const user = await response.json();
  if (user.id !== userId || !Array.isArray(user.linked_accounts)) throw new HttpError(401, 'Your account could not be verified. Sign in again.');
  const twitter = user.linked_accounts.find((account: { type?: string }) => account.type === 'twitter_oauth');
  if (!twitter || typeof twitter.username !== 'string' || !/^[A-Za-z0-9_]{1,15}$/.test(twitter.username)) {
    throw new HttpError(403, 'Link and verify your Twitter account with Privy before publishing.');
  }
  return twitter.username;
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
    if (body?.code === '23505') throw new HttpError(409, 'This contract is already in the public directory. Search for its address to find the submission.');
    throw new HttpError(503, 'We could not save your project. Please try again.');
  }
  if (!Array.isArray(body) || !body[0]) throw new HttpError(503, 'The server response was incomplete. Refresh the directory before trying again.');
  return body[0];
}

Deno.serve(createHandler({ origins, authenticate, insert }));
