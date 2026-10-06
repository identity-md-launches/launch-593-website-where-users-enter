import { schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { validateProject } from '../lib/projects';
import type { Project, ProjectInput } from '../lib/submissions';

export const DEFAULT_RELAYS = ['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nostr.mom'];
export const DIRECTORY_TAG = 'identitymd-593-projects-v1';
const SCHEMA = 'identitymd-project-v1';
const TIMEOUT = 10_000;
const PAGE_SIZE = 250;

export interface PublicEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

function eventId(event: Omit<PublicEvent, 'id' | 'sig'>): string {
  return bytesToHex(sha256(new TextEncoder().encode(JSON.stringify([
    0, event.pubkey, event.created_at, event.kind, event.tags, event.content,
  ]))));
}

export function normalizeInput(input: ProjectInput): ProjectInput {
  return {
    twitterUsername: input.twitterUsername.trim().replace(/^@/, ''),
    projectUsername: input.projectUsername.trim().replace(/^@/, ''),
    contract: input.contract.trim().toLowerCase(),
    description: input.description.trim(),
    wallet: input.wallet.trim(),
  };
}

export function createProjectEvent(input: ProjectInput, directoryTag = DIRECTORY_TAG): PublicEvent {
  const normalized = normalizeInput(input);
  if (Object.keys(validateProject(normalized)).length) throw new Error('Check all five project details before publishing.');
  // A one-use transport key, never a wallet, account credential or shared secret.
  const key = schnorr.utils.randomPrivateKey();
  const event = {
    pubkey: bytesToHex(schnorr.getPublicKey(key)),
    created_at: Math.floor(Date.now() / 1000),
    kind: 1,
    tags: [['t', directoryTag]],
    content: JSON.stringify({ schema: SCHEMA, ...normalized }),
  };
  const id = eventId(event);
  const sig = bytesToHex(schnorr.sign(id, key));
  key.fill(0);
  return { ...event, id, sig };
}

/** Public relays and their payloads are untrusted. Only signed, valid records reach React. */
export function decodeProject(value: unknown, directoryTag = DIRECTORY_TAG): Project | null {
  try {
    if (!value || typeof value !== 'object') return null;
    const event = value as PublicEvent;
    if (event.kind !== 1 || !Number.isSafeInteger(event.created_at) || event.created_at < 0 || event.created_at > Date.now() / 1000 + 60) return null;
    if (typeof event.content !== 'string' || event.content.length > 8_000 || !Array.isArray(event.tags) || event.tags.length > 20) return null;
    if (!event.tags.every(tag => Array.isArray(tag) && tag.every(item => typeof item === 'string' && item.length < 256))) return null;
    if (!event.tags.some(tag => tag[0] === 't' && tag[1] === directoryTag)) return null;
    if (event.tags.some(tag => tag[0] === 'expiration')) return null;
    if (!/^[a-f0-9]{64}$/.test(event.id) || !/^[a-f0-9]{64}$/.test(event.pubkey) || !/^[a-f0-9]{128}$/.test(event.sig)) return null;
    if (eventId(event) !== event.id || !schnorr.verify(event.sig, event.id, event.pubkey)) return null;
    const content = JSON.parse(event.content) as Record<string, unknown>;
    if (!content || content.schema !== SCHEMA) return null;
    if (!['twitterUsername', 'projectUsername', 'contract', 'description', 'wallet'].every(key => typeof content[key] === 'string')) return null;
    const input = normalizeInput(content as unknown as ProjectInput);
    if (Object.keys(validateProject(input)).length) return null;
    return { ...input, id: event.id, createdAt: new Date(event.created_at * 1000).toISOString() };
  } catch { return null; }
}

function relayUrls(urls: readonly string[]): string[] {
  const valid = [...new Set(urls)].filter(url => {
    try { const parsed = new URL(url); return parsed.protocol === 'wss:' && !parsed.username && !parsed.password; }
    catch { return false; }
  });
  if (valid.length < 2) throw new Error('The public directory needs at least two secure storage connections. Please try again later.');
  return valid;
}

/** Every connection has a deadline and closes on success, rejection, or transport failure. */
function exchange<T>(url: string, start: (send: (message: unknown[]) => void) => void, receive: (message: unknown[], done: (result: T) => void, fail: () => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    let socket: WebSocket;
    let finished = false;
    const finish = (result?: T, failed = false) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (socket) {
        socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
        socket.close();
      }
      if (failed) reject(new Error('Public storage could not be reached.'));
      else resolve(result as T);
    };
    const timer = setTimeout(() => finish(undefined, true), TIMEOUT);
    try {
      socket = new WebSocket(url);
      socket.onopen = () => { try { start(message => socket.send(JSON.stringify(message))); } catch { finish(undefined, true); } };
      socket.onerror = socket.onclose = () => finish(undefined, true);
      socket.onmessage = message => {
        if (typeof message.data !== 'string' || message.data.length > 20_000) return;
        let data: unknown;
        try { data = JSON.parse(message.data); } catch { return; }
        if (Array.isArray(data)) receive(data, value => finish(value), () => finish(undefined, true));
      };
    } catch { finish(undefined, true); }
  });
}

function queryRelay(url: string, filter: Record<string, unknown>): Promise<PublicEvent[]> {
  const subscription = crypto.randomUUID();
  const records: PublicEvent[] = [];
  return exchange(url, send => send(['REQ', subscription, filter]), (message, done, fail) => {
    if (message[1] !== subscription) return;
    if (message[0] === 'CLOSED') fail();
    if (message[0] === 'EOSE') done(records);
    if (message[0] === 'EVENT' && records.length < 10_000 && message[2] && typeof message[2] === 'object') records.push(message[2] as PublicEvent);
  });
}

async function readRelay(url: string, directoryTag: string): Promise<Project[]> {
  const projects = new Map<string, Project>();
  const seen = new Set<string>();
  let until = Math.floor(Date.now() / 1000) + 60;
  const deadline = Date.now() + 20_000;
  // Inclusive timestamp overlap avoids dropping records on a page boundary.
  // Refuse a stalled/oversized history rather than present it as an empty directory.
  for (let page = 0; page < 40; page++) {
    if (Date.now() > deadline) throw new Error('The storage history took too long to load.');
    const events = await queryRelay(url, { kinds: [1], '#t': [directoryTag], until, limit: PAGE_SIZE });
    const previousSize = seen.size;
    let oldest = until;
    for (const event of events) {
      if (typeof event.id === 'string') seen.add(event.id);
      if (Number.isSafeInteger(event.created_at) && event.created_at >= 0) oldest = Math.min(oldest, event.created_at);
      const project = decodeProject(event, directoryTag);
      if (project) projects.set(project.id, project);
    }
    if (events.length < PAGE_SIZE) return [...projects.values()];
    if (seen.size === previousSize) throw new Error('The storage history could not be fully loaded.');
    until = oldest;
  }
  throw new Error('The storage history exceeds the directory’s retrieval limit.');
}

export function uniqueProjects(projects: Project[]): Project[] {
  // The first observed signed submission wins a repeated contract; this is not proof of ownership.
  const ordered = [...projects].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const contracts = new Map<string, Project>();
  for (const project of ordered) if (!contracts.has(project.contract.toLowerCase())) contracts.set(project.contract.toLowerCase(), project);
  return [...contracts.values()].reverse();
}

export async function readPublicProjects(urls = DEFAULT_RELAYS, directoryTag = DIRECTORY_TAG): Promise<Project[]> {
  const results = await Promise.allSettled(relayUrls(urls).map(url => readRelay(url, directoryTag)));
  const available = results.filter((result): result is PromiseFulfilledResult<Project[]> => result.status === 'fulfilled');
  if (available.length < 2) throw new Error('Unable to load public projects from enough storage services. Check your connection and select Try again.');
  return uniqueProjects(available.flatMap(result => result.value));
}

let pending: { content: string; directoryTag: string; event: PublicEvent } | undefined;

export async function publishPublicProject(input: ProjectInput, urls = DEFAULT_RELAYS, directoryTag = DIRECTORY_TAG): Promise<Project> {
  const relays = relayUrls(urls);
  const normalized = normalizeInput(input);
  const content = JSON.stringify(normalized);
  // Retry the exact signed event after an uncertain network result, never a new duplicate.
  const event = pending?.content === content && pending.directoryTag === directoryTag
    ? pending.event : createProjectEvent(normalized, directoryTag);
  pending = { content, directoryTag, event };
  const existing = await readPublicProjects(relays, directoryTag);
  const duplicate = existing.find(project => project.contract.toLowerCase() === normalized.contract);
  if (duplicate && duplicate.id !== event.id) throw new Error('This contract is already in the public directory. Search for its address to find the submission.');
  const results = await Promise.allSettled(relays.map(async url => {
    await exchange<boolean>(url, send => send(['EVENT', event]), (message, done, fail) => {
      if (message[0] === 'OK' && message[1] === event.id) { if (message[2] === true) done(true); else fail(); }
    });
    // Use a separate subscription/connection: ACK alone is insufficient evidence of a readable copy.
    const stored = await queryRelay(url, { ids: [event.id] });
    if (!stored.some(value => decodeProject(value, directoryTag)?.id === event.id)) throw new Error('Readback failed.');
  }));
  if (results.filter(result => result.status === 'fulfilled').length < 2) {
    throw new Error('Unable to confirm two public copies. Your project may already be visible. Keep this form open and try Publish project again to finish saving.');
  }
  return decodeProject(event, directoryTag)!;
}
