import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProjectEvent, decodeProject, DEFAULT_RELAYS, DIRECTORY_TAG, publishPublicProject, readPublicProjects, uniqueProjects, type PublicEvent } from '../src/services/public-directory';
import { fetchProjects, submitProject, type ProjectInput } from '../src/services/directory';

const input: ProjectInput = {
  twitterUsername: '@pond_builder', projectUsername: 'open_pond',
  contract: `0x${'AB'.repeat(20)}`, wallet: `0x${'cd'.repeat(20)}`,
  description: 'Open tools for people building useful projects together.',
};

const storage = new Map<string, Map<string, PublicEvent>>();
const offline = new Set<string>();
const rejectWrites = new Set<string>();
const hideWrites = new Set<string>();
const silent = new Set<string>();
const messages: { url: string; message: unknown[] }[] = [];
const sockets: RelaySocket[] = [];

class RelaySocket {
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((message: { data: string }) => void) | null = null;
  closed = false;
  constructor(readonly url: string) {
    sockets.push(this);
    Promise.resolve().then(() => { if (offline.has(url)) this.onerror?.(); else if (!silent.has(url)) this.onopen?.(); });
  }
  emit(message: unknown[]) { Promise.resolve().then(() => this.onmessage?.({ data: JSON.stringify(message) })); }
  close() { this.closed = true; }
  send(raw: string) {
    const message = JSON.parse(raw) as unknown[];
    messages.push({ url: this.url, message });
    if (message[0] === 'EVENT') {
      const event = message[1] as PublicEvent;
      if (!rejectWrites.has(this.url) && !hideWrites.has(this.url)) storage.get(this.url)!.set(event.id, event);
      this.emit(['OK', event.id, !rejectWrites.has(this.url), '']);
    }
    if (message[0] === 'REQ') {
      const filter = message[2] as { ids?: string[]; '#t'?: string[]; until?: number; limit?: number };
      const events = [...storage.get(this.url)!.values()].filter(event =>
        (!filter.ids || filter.ids.includes(event.id)) &&
        (!filter['#t'] || event.tags.some(tag => tag[0] === 't' && filter['#t']!.includes(tag[1]))) &&
        (filter.until === undefined || event.created_at <= filter.until))
        .sort((a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id))
        .slice(0, filter.limit ?? 1000);
      for (const event of events) this.emit(['EVENT', message[1], event]);
      this.emit(['EOSE', message[1]]);
    }
  }
}

beforeEach(() => {
  storage.clear(); offline.clear(); rejectWrites.clear(); hideWrites.clear(); silent.clear();
  messages.length = 0; sockets.length = 0;
  for (const url of DEFAULT_RELAYS) storage.set(url, new Map());
  vi.stubGlobal('WebSocket', RelaySocket);
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('public event integrity', () => {
  it('signs all five fields and rejects tampering, foreign namespaces, expiration and invalid fields', () => {
    const event = createProjectEvent(input);
    expect(decodeProject(event)).toMatchObject({ ...input, twitterUsername: 'pond_builder', contract: input.contract.toLowerCase(), id: event.id });
    expect(decodeProject({ ...event, content: event.content.replace('open_pond', 'forged') })).toBeNull();
    expect(decodeProject({ ...event, sig: '00'.repeat(64) })).toBeNull();
    expect(decodeProject(createProjectEvent(input, 'another-directory'))).toBeNull();
    expect(decodeProject({ ...event, tags: [...event.tags, ['expiration', '1']] })).toBeNull();
    expect(decodeProject({ ...event, tags: [null] })).toBeNull();
    expect(decodeProject(null)).toBeNull();
    expect(() => createProjectEvent({ ...input, wallet: 'not-an-address' })).toThrow('Check all five');
  });

  it('deduplicates repeated contracts deterministically without treating claims as verified ownership', () => {
    const first = decodeProject(createProjectEvent(input))!;
    const later = { ...first, id: 'later', contract: first.contract.toUpperCase(), projectUsername: 'imposter', createdAt: '2099-01-01T00:00:00.000Z' };
    expect(uniqueProjects([later, first, first])).toEqual([first]);
  });
});

describe('shared public transport', () => {
  it('uses real shared transport with blank Supabase config and reads from a new connection', async () => {
    const published = await submitProject({ url: '', anonKey: '' }, input);
    expect(await fetchProjects({ url: '', anonKey: '' })).toEqual([published]);
    expect(storage.get(DEFAULT_RELAYS[0])!.size).toBe(1);
    expect(messages.filter(row => row.message[0] === 'EVENT')).toHaveLength(3);
    expect(messages.filter(row => row.message[0] === 'REQ' && 'ids' in (row.message[2] as object))).toHaveLength(3);
    expect(sockets.every(socket => socket.closed)).toBe(true);
  });

  it('publishes despite one offline relay and merges records from the available relays', async () => {
    offline.add(DEFAULT_RELAYS[2]);
    const published = await publishPublicProject(input);
    const second = createProjectEvent({ ...input, contract: `0x${'01'.repeat(20)}`, projectUsername: 'second_pond' });
    storage.get(DEFAULT_RELAYS[1])!.set(second.id, second);
    const projects = await readPublicProjects();
    expect(projects.map(project => project.id)).toEqual(expect.arrayContaining([published.id, second.id]));
    expect(projects).toHaveLength(2);
  });

  it('does not report success for a single saved copy and retries the same event', async () => {
    rejectWrites.add(DEFAULT_RELAYS[1]); rejectWrites.add(DEFAULT_RELAYS[2]);
    await expect(publishPublicProject(input)).rejects.toThrow('may already be visible');
    const firstId = [...storage.get(DEFAULT_RELAYS[0])!.keys()][0];
    rejectWrites.clear();
    const published = await publishPublicProject(input);
    expect(published.id).toBe(firstId);
    expect(storage.get(DEFAULT_RELAYS[0])!.size).toBe(1);
  });

  it('requires readback, not just a positive acknowledgement', async () => {
    for (const url of DEFAULT_RELAYS) hideWrites.add(url);
    await expect(publishPublicProject(input)).rejects.toThrow('Unable to confirm two public copies');
    expect(sockets.every(socket => socket.closed)).toBe(true);
  });

  it('rejects an existing contract before sending any new public event', async () => {
    const event = createProjectEvent({ ...input, projectUsername: 'first_submitter' });
    for (const records of storage.values()) records.set(event.id, event);
    await expect(publishPublicProject(input)).rejects.toThrow('already in the public directory');
    expect(messages.filter(row => row.message[0] === 'EVENT')).toHaveLength(0);
  });

  it('distinguishes an empty directory from unreachable storage and never uses localStorage', async () => {
    expect(await readPublicProjects()).toEqual([]);
    for (const url of DEFAULT_RELAYS) offline.add(url);
    await expect(readPublicProjects()).rejects.toThrow('Unable to load public projects');
    expect(localStorage.length).toBe(0);
    expect(sockets.every(socket => socket.closed)).toBe(true);
  });

  it('bounds silent connections and closes sockets on timeout', async () => {
    vi.useFakeTimers();
    for (const url of DEFAULT_RELAYS) silent.add(url);
    const result = expect(readPublicProjects()).rejects.toThrow('Unable to load public projects');
    await vi.advanceTimersByTimeAsync(10_001);
    await result;
    expect(sockets.every(socket => socket.closed)).toBe(true);
  });

  it('paginates past a full page, overlaps boundary timestamps and discards forged data', async () => {
    const event = createProjectEvent({ ...input, projectUsername: 'valid_record' });
    const records = storage.get(DEFAULT_RELAYS[0])!;
    records.set(event.id, event);
    // A page of untrusted entries must not hide a valid older submission.
    for (let i = 1; i <= 250; i++) {
      const id = i.toString(16).padStart(64, '0');
      records.set(id, { ...event, id, created_at: event.created_at + 1 });
    }
    // More than a whole page at one second is detected as stalled, never silently truncated.
    storage.set(DEFAULT_RELAYS[1], records);
    offline.add(DEFAULT_RELAYS[2]);
    await expect(readPublicProjects()).rejects.toThrow('Unable to load public projects');
    records.clear();
    for (let i = 1; i <= 250; i++) {
      const id = i.toString(16).padStart(64, '0');
      records.set(id, { ...event, id, created_at: event.created_at - i });
    }
    records.set(event.id, event);
    expect(await readPublicProjects()).toEqual([decodeProject(event)]);
    expect(messages.some(row => (row.message[2] as { until?: number })?.until === event.created_at - 249)).toBe(true);
  });

  it('rejects insecure or duplicate relay configuration and excludes other namespaces', async () => {
    await expect(readPublicProjects(['ws://localhost', 'https://example.com'])).rejects.toThrow('two secure storage');
    await expect(readPublicProjects([DEFAULT_RELAYS[0], DEFAULT_RELAYS[0]])).rejects.toThrow('two secure storage');
    const event = createProjectEvent(input, `${DIRECTORY_TAG}-test`);
    storage.get(DEFAULT_RELAYS[0])!.set(event.id, event);
    expect(await readPublicProjects()).toEqual([]);
  });
});
