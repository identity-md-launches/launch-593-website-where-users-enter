import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, validateInput, HttpError } from '../supabase/functions/submit-project/core.ts';
import { fetchProjects, submitProject } from '../../src/lib/submissions.ts';

const input = { projectUsername: 'pond_ai', contract: `0x${'ab'.repeat(20)}`, description: 'An open community of AI project builders.', wallet: `0x${'cd'.repeat(20)}` };
const project = { ...input, twitterUsername: 'verified_frog', id: 'project-1', createdAt: '2026-10-02T12:00:00Z' };
const config = { url: 'https://example.supabase.co', anonKey: 'public-key' };
const request = (body = input, headers = {}) => new Request('https://example.test/submit-project', {
  method: 'POST', headers: { Origin: 'https://pond.example', Authorization: 'Bearer privy-token', 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body),
});
const handler = (overrides = {}) => createHandler({ origins: ['https://pond.example'], authenticate: async () => 'verified_frog', insert: async (data, twitterUsername) => ({ ...project, ...data, twitterUsername }), ...overrides });

test('valid input is normalized and untrusted identity is discarded', () => {
  assert.deepEqual(validateInput({ ...input, projectUsername: ' @pond_ai ', contract: input.contract.toUpperCase().replace('0X', '0x'), twitterUsername: 'imposter' }), input);
});

test('invalid and zero addresses, invalid username, and short or oversized descriptions are rejected', () => {
  for (const bad of [{ contract: 'wrong' }, { wallet: `0x${'0'.repeat(40)}` }, { projectUsername: '<script>' }, { description: 'short' }, { description: 'x'.repeat(1001) }]) {
    assert.throws(() => validateInput({ ...input, ...bad }), (error) => error instanceof HttpError && error.status === 400);
  }
});

test('submission uses verified Twitter handle and returns persisted row', async () => {
  const response = await handler()(request({ ...input, twitterUsername: 'imposter' }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).twitterUsername, 'verified_frog');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://pond.example');
});

test('authentication failure never reaches persistence', async () => {
  let inserts = 0;
  const response = await handler({ authenticate: async () => { throw new HttpError(401, 'Sign in again.'); }, insert: async () => { inserts++; } })(request());
  assert.equal(response.status, 401);
  assert.equal(inserts, 0);
});

test('missing token, foreign origin, malformed JSON and oversized stream are rejected', async () => {
  const cases = [
    [request(input, { Authorization: '' }), 401],
    [request(input, { Origin: 'https://evil.example' }), 403],
    [request('{'), 400],
    [request('x'.repeat(16_385)), 413],
  ];
  for (const [req, status] of cases) assert.equal((await handler()(req)).status, status);
});

test('preflight does not authenticate and unsupported methods explain allowed methods', async () => {
  const handle = handler({ authenticate: async () => { throw new Error('must not run'); } });
  const preflight = await handle(new Request('https://example.test', { method: 'OPTIONS', headers: { Origin: 'https://pond.example' } }));
  assert.equal(preflight.status, 204);
  const wrongMethod = await handle(new Request('https://example.test'));
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get('Allow'), 'POST, OPTIONS');
});

test('duplicate contract error is actionable and private errors are not exposed', async () => {
  const duplicate = await handler({ insert: async () => { throw new HttpError(409, 'This contract is already listed.'); } })(request());
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).error, 'This contract is already listed.');
  const unavailable = await handler({ insert: async () => { throw new Error('secret database details'); } })(request());
  assert.equal(unavailable.status, 503);
  assert.ok(!(await unavailable.text()).includes('secret'));
});

test('public fetch has no auth requirement and transport sends Privy bearer only on submit', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, init }); return Response.json(init.method === 'POST' ? project : [project]); };
  try {
    assert.deepEqual(await fetchProjects(config), [project]);
    assert.deepEqual(await submitProject(config, input, 'signed-token'), project);
    assert.equal(calls[0].init.headers.Authorization, undefined);
    assert.equal(calls[1].init.headers.Authorization, 'Bearer signed-token');
    assert.equal(JSON.parse(calls[1].init.body).twitterUsername, undefined);
  } finally { globalThis.fetch = original; }
});

test('public fetch traverses pages and submit exposes server errors', async () => {
  const original = globalThis.fetch;
  let page = 0;
  globalThis.fetch = async () => Response.json(page++ === 0 ? Array.from({ length: 250 }, (_, i) => ({ ...project, id: `id-${i}` })) : [{ ...project, id: 'last' }]);
  try {
    assert.equal((await fetchProjects(config)).length, 251);
    globalThis.fetch = async () => Response.json({ error: 'This contract is already listed.' }, { status: 409 });
    await assert.rejects(submitProject(config, input, 'token'), /already listed/);
    await assert.rejects(submitProject(config, input, ''), /Sign in with Twitter/);
  } finally { globalThis.fetch = original; }
});
