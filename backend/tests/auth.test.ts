// Synthetic signed tokens validate the real Edge Function entry point without
// contacting Privy or Supabase. Run with Deno (see backend/README.md).
import { exportSPKI, generateKeyPair, SignJWT } from 'npm:jose@6.2.12';

const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
const appId = 'test-pond-app';
Deno.env.set('PRIVY_APP_ID', appId);
Deno.env.set('PRIVY_APP_SECRET', 'synthetic-test-secret');
Deno.env.set('PRIVY_VERIFICATION_KEY', await exportSPKI(publicKey));
Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-service-key');
Deno.env.set('ALLOWED_ORIGINS', 'https://pond.example');

let handler: (request: Request) => Promise<Response>;
const serve = Deno.serve;
Deno.serve = ((fn: unknown) => { handler = fn as typeof handler; }) as unknown as typeof Deno.serve;
await import('../supabase/functions/submit-project/index.ts');
Deno.serve = serve;

const input = { projectUsername: 'pond_ai', contract: `0x${'ab'.repeat(20)}`, wallet: `0x${'cd'.repeat(20)}`, description: 'An open community building useful AI tools.', twitterUsername: 'imposter' };
async function token(options: { audience?: string; issuer?: string; expiry?: string; otherKey?: boolean } = {}) {
  const key = options.otherKey ? (await generateKeyPair('ES256')).privateKey : privateKey;
  return new SignJWT({}).setProtectedHeader({ alg: 'ES256' }).setSubject('did:privy:test-user')
    .setIssuer(options.issuer ?? 'privy.io').setAudience(options.audience ?? appId)
    .setIssuedAt().setExpirationTime(options.expiry ?? '5m').sign(key);
}
function req(accessToken: string) {
  return new Request('https://example.test/submit-project', { method: 'POST', headers: { Origin: 'https://pond.example', 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(input) });
}
function assert(condition: unknown, message: string) { if (!condition) throw new Error(message); }

Deno.test('signed Privy JWT publishes with server-derived Twitter identity', async () => {
  const original = globalThis.fetch;
  let inserted: Record<string, unknown> | undefined;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url).startsWith('https://api.privy.io/v1/users/')) return Response.json({ id: 'did:privy:test-user', linked_accounts: [{ type: 'twitter_oauth', username: 'verified_frog' }] });
    inserted = JSON.parse(String(init?.body));
    return Response.json([{ ...input, twitterUsername: inserted!.twitter_username, id: 'real-row', createdAt: '2026-10-02T12:00:00Z' }], { status: 201 });
  }) as typeof fetch;
  try {
    const response = await handler(req(await token()));
    assert(response.status === 201, 'valid token should publish');
    assert(inserted?.twitter_username === 'verified_frog', 'client identity must not be trusted');
    assert(!('twitterUsername' in inserted!), 'untrusted client property must be discarded');
  } finally { globalThis.fetch = original; }
});

Deno.test('expired, wrong audience, wrong issuer, forged, and malformed tokens are rejected before network', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (() => { calls++; throw new Error('No network expected'); }) as typeof fetch;
  try {
    for (const jwt of [await token({ expiry: '-1m' }), await token({ audience: 'another-app' }), await token({ issuer: 'attacker.example' }), await token({ otherKey: true }), 'not-a-jwt']) {
      const response = await handler(req(jwt));
      assert(response.status === 401, 'invalid JWT should receive 401');
    }
    assert(calls === 0, 'invalid tokens must never reach Privy or persistence');
  } finally { globalThis.fetch = original; }
});

Deno.test('valid Privy session without a Twitter account cannot publish', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (() => { calls++; return Promise.resolve(Response.json({ id: 'did:privy:test-user', linked_accounts: [{ type: 'email', address: 'test@example.test' }] })); }) as typeof fetch;
  try {
    const response = await handler(req(await token()));
    assert(response.status === 403, 'Twitter account is required');
    assert(calls === 1, 'must not insert without Twitter');
  } finally { globalThis.fetch = original; }
});
