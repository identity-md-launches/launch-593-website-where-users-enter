// Exercises the real Edge Function entry point with Supabase Auth and database
// responses mocked. Run with Deno (see backend/README.md).
Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY', 'synthetic-anon-key');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-service-key');
Deno.env.set('ALLOWED_ORIGINS', 'https://pond.example');

let handler: (request: Request) => Promise<Response>;
const serve = Deno.serve;
Deno.serve = ((fn: unknown) => { handler = fn as typeof handler; }) as unknown as typeof Deno.serve;
await import('../supabase/functions/submit-project/index.ts');
Deno.serve = serve;

const input = { projectUsername: 'pond_ai', contract: `0x${'ab'.repeat(20)}`, wallet: `0x${'cd'.repeat(20)}`, description: 'An open community building useful AI tools.', twitterUsername: 'imposter' };
function req(accessToken: string) {
  return new Request('https://example.test/submit-project', { method: 'POST', headers: { Origin: 'https://pond.example', 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(input) });
}
function assert(condition: unknown, message: string) { if (!condition) throw new Error(message); }
const isUserLookup = (url: string | URL | Request) => String(url).startsWith('https://example.supabase.co/auth/v1/user');

Deno.test('a Supabase Auth session with a Twitter identity submits with the server-derived handle', async () => {
  const original = globalThis.fetch;
  let inserted: Record<string, unknown> | undefined;
  let lookupHeaders: Headers | undefined;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    if (isUserLookup(url)) {
      lookupHeaders = new Headers(init?.headers);
      return Response.json({ id: 'user-1', identities: [{ provider: 'twitter', identity_data: { user_name: 'verified_frog', name: 'Verified Frog' } }] });
    }
    inserted = JSON.parse(String(init?.body));
    return Response.json([{ ...input, twitterUsername: inserted!.twitter_username, id: 'real-row', createdAt: '2026-10-02T12:00:00Z' }], { status: 201 });
  }) as typeof fetch;
  try {
    const response = await handler(req('session-token'));
    assert(response.status === 201, 'valid session should submit');
    assert(lookupHeaders?.get('Authorization') === 'Bearer session-token', 'the caller token must be verified by Supabase Auth');
    assert(inserted?.twitter_username === 'verified_frog', 'client identity must not be trusted');
    assert(!('twitterUsername' in inserted!), 'untrusted client property must be discarded');
  } finally { globalThis.fetch = original; }
});

Deno.test('a token Supabase Auth rejects never reaches the database', async () => {
  const original = globalThis.fetch;
  let inserts = 0;
  globalThis.fetch = ((url: string | URL | Request) => {
    if (isUserLookup(url)) return Promise.resolve(Response.json({ code: 401, msg: 'invalid JWT' }, { status: 401 }));
    inserts++;
    throw new Error('No insert expected');
  }) as typeof fetch;
  try {
    const response = await handler(req('forged-or-expired'));
    assert(response.status === 401, 'invalid session should receive 401');
    assert(inserts === 0, 'invalid tokens must never reach persistence');
  } finally { globalThis.fetch = original; }
});

Deno.test('a valid session without a Twitter identity cannot submit', async () => {
  const original = globalThis.fetch;
  let inserts = 0;
  globalThis.fetch = ((url: string | URL | Request) => {
    if (isUserLookup(url)) return Promise.resolve(Response.json({ id: 'user-2', identities: [{ provider: 'email', identity_data: { email: 'test@example.test' } }], user_metadata: { user_name: 'spoofed' } }));
    inserts++;
    throw new Error('No insert expected');
  }) as typeof fetch;
  try {
    const response = await handler(req('email-session'));
    assert(response.status === 403, 'Twitter identity is required');
    assert(inserts === 0, 'must not insert without Twitter');
  } finally { globalThis.fetch = original; }
});
