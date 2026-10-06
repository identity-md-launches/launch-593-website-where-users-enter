import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, validateInput, HttpError } from '../supabase/functions/submit-project/core.ts';
import { fetchProjects, submitProject } from '../../src/lib/submissions.ts';

const input = { twitterUsername: 'self_reported', projectUsername: 'pond_ai', contract: `0x${'ab'.repeat(20)}`, description: 'An open community of AI project builders.', wallet: `0x${'cd'.repeat(20)}` };
const project = { ...input, id: 'project-1', createdAt: '2026-10-02T12:00:00Z' };
const config = { url: 'https://example.supabase.co', anonKey: 'public-key' };
const request = (body = input, headers = {}) => new Request('https://example.test/submit-project', {
  method: 'POST', headers: { Origin: 'https://pond.example', 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body),
});
const handler = (overrides = {}) => createHandler({ origins: ['https://pond.example'], insert: async (data) => ({ ...project, ...data }), ...overrides });

test('all five input fields are normalized and unrelated properties are discarded', () => {
  assert.deepEqual(validateInput({ ...input, projectUsername: ' @pond_ai ', contract: input.contract.toUpperCase().replace('0X', '0x'), twitterUsername: ' @self_reported ', verified: true }), input);
});

test('invalid and zero addresses, invalid username, and short or oversized descriptions are rejected', () => {
  for (const bad of [{ twitterUsername: '@' }, { projectUsername: '' }, { projectUsername: 'invalid-handle' }, { projectUsername: 'x'.repeat(16) }, { twitterUsername: 'not a handle' }, { twitterUsername: 'x'.repeat(16) }, { contract: 'wrong' }, { wallet: `0x${'0'.repeat(40)}` }, { projectUsername: '<script>' }, { description: 'short' }, { description: 'x'.repeat(1001) }]) {
    assert.throws(() => validateInput({ ...input, ...bad }), (error) => error instanceof HttpError && error.status === 400);
  }
});

test('submission needs no token and persists the self-reported Twitter handle', async () => {
  const response = await handler()(request({ ...input, twitterUsername: ' @self_reported ', verified: true }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).twitterUsername, 'self_reported');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://pond.example');
});

test('invalid Twitter input never reaches persistence', async () => {
  let inserts = 0;
  const response = await handler({ insert: async () => { inserts++; } })(request({ ...input, twitterUsername: 'invalid/handle' }));
  assert.equal(response.status, 400);
  assert.equal(inserts, 0);
});

test('blank or omitted personal Twitter persists without relaxing required project Twitter', async () => {
  for (const twitterUsername of ['', '   ', undefined]) {
    const response = await handler()(request({ ...input, twitterUsername }));
    assert.equal(response.status, 201);
    assert.equal((await response.json()).twitterUsername, '');
  }
  const response = await handler()(request({ ...input, twitterUsername: '', projectUsername: '' }));
  assert.equal(response.status, 400);
});

test('foreign origin, wrong content type, malformed JSON and oversized stream are rejected', async () => {
  const cases = [
    [request(input, { 'Content-Type': 'text/plain' }), 415],
    [request(input, { Origin: 'https://evil.example' }), 403],
    [request('{'), 400],
    [request('x'.repeat(16_385)), 413],
  ];
  for (const [req, status] of cases) assert.equal((await handler()(req)).status, status);
});

test('preflight requires no account and unsupported methods explain allowed methods', async () => {
  const handle = handler();
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

test('public reads and writes do not send an account token; all five details are sent', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, init }); return Response.json(init.method === 'POST' ? project : [project]); };
  try {
    assert.deepEqual(await fetchProjects(config), [project]);
    assert.deepEqual(await submitProject(config, input), project);
    assert.equal(calls[0].init.headers.Authorization, undefined);
    assert.equal(calls[1].init.headers.Authorization, undefined);
    assert.equal(JSON.parse(calls[1].init.body).twitterUsername, input.twitterUsername);
  } finally { globalThis.fetch = original; }
});

test('public fetch traverses pages and submit exposes server errors', async () => {
  const original = globalThis.fetch;
  let page = 0;
  globalThis.fetch = async () => Response.json(page++ === 0 ? Array.from({ length: 250 }, (_, i) => ({ ...project, id: `id-${i}` })) : [{ ...project, id: 'last' }]);
  try {
    assert.equal((await fetchProjects(config)).length, 251);
    globalThis.fetch = async () => Response.json({ error: 'This contract is already listed.' }, { status: 409 });
    await assert.rejects(submitProject(config, input), /already listed/);
  } finally { globalThis.fetch = original; }
});
