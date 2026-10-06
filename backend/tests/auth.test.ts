// Kept at the existing task path so the locked Deno configuration stays intact.
// These tests exercise the real public Edge Function with a mocked database.
Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-service-key');
Deno.env.set('ALLOWED_ORIGINS', 'https://pond.example');

let handler: (request: Request) => Promise<Response>;
const serve = Deno.serve;
Deno.serve = ((fn: unknown) => { handler = fn as typeof handler; }) as unknown as typeof Deno.serve;
await import('../supabase/functions/submit-project/index.ts');
Deno.serve = serve;

const input = { projectUsername: 'pond_ai', contract: `0x${'ab'.repeat(20)}`, description: 'An open community building useful AI tools.', twitterUsername: ' @builder ' };
function req(body: unknown = input) {
  return new Request('https://example.test/submit-project', { method: 'POST', headers: { Origin: 'https://pond.example', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
function assert(condition: unknown, message: string) { if (!condition) throw new Error(message); }

Deno.test('publishes without sign-in, using only a server-held database key', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls++;
    assert(String(url).startsWith('https://example.supabase.co/rest/v1/projects?'), 'only the database should be contacted');
    assert(new Headers(init?.headers).get('Authorization') === 'Bearer synthetic-service-key', 'server key stays on the database request');
    const inserted = JSON.parse(String(init?.body));
    assert(inserted.twitter_username === 'builder', 'self-reported handle is normalized');
    assert(!('wallet' in inserted), 'wallet is not persisted');
    assert(!new URL(String(url)).searchParams.get('select')!.includes('wallet'), 'wallet is not returned');
    assert(!('verified' in inserted), 'do not persist client verification claims');
    return Response.json([{ ...input, twitterUsername: inserted.twitter_username, id: 'real-row', createdAt: '2026-10-06T12:00:00Z' }], { status: 201 });
  }) as typeof fetch;
  try {
    const response = await handler(req({ ...input, verified: true }));
    assert(response.status === 201, 'valid input should publish');
    assert((await response.json()).twitterUsername === 'builder', 'return persisted row');
    assert(calls === 1, 'no OAuth or account lookup');
  } finally { globalThis.fetch = original; }
});

Deno.test('invalid self-reported handle is rejected before network', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (() => { calls++; throw new Error('No network expected'); }) as typeof fetch;
  try {
    for (const twitterUsername of ['@', 'bad handle', 'x'.repeat(16)]) {
      const response = await handler(req({ ...input, twitterUsername }));
      assert(response.status === 400, 'invalid handle should receive 400');
    }
    assert(calls === 0, 'invalid input must not reach persistence');
  } finally { globalThis.fetch = original; }
});

Deno.test('duplicate database records return a recoverable error', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (() => Promise.resolve(Response.json({ code: '23505' }, { status: 409 }))) as typeof fetch;
  try {
    const response = await handler(req());
    assert(response.status === 409, 'return a conflict');
    assert((await response.json()).error.includes('Search for its address'), 'explain recovery');
  } finally { globalThis.fetch = original; }
});
