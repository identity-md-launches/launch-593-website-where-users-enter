import { createContext, useContext, useEffect, useSyncExternalStore, type PropsWithChildren } from 'react';
import { siteConfig } from './config';

// Twitter verification through Supabase Auth's Twitter provider, using the
// Auth REST API directly (OAuth with PKCE). No SDK and no wallet.

type AuthState = {
  ready: boolean;
  authenticated: boolean;
  twitterUsername: string | null;
  error: string | null;
};

type AuthContextValue = AuthState & {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix seconds
  twitterUsername: string;
}

interface AuthUser {
  id?: string;
  identities?: { provider?: string; identity_data?: Record<string, unknown> }[];
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: AuthUser;
}

export const previewMessage = 'Twitter verification is not available in this preview.';
export const sessionMessage = 'Your Twitter verification expired. Verify with Twitter again.';
export const twitterMessage = 'A Twitter account is required. Verify with Twitter again.';
const cancelledMessage = 'Twitter verification was not completed. Try again.';
const startMessage = 'Unable to start Twitter verification. Check your connection and try again.';

const SESSION_KEY = 'pepe:auth:session';
const VERIFIER_KEY = 'pepe:auth:verifier';
export const RESUME_KEY = 'pepe:auth:resume';
const configured = Boolean(siteConfig.supabaseUrl && siteConfig.supabaseAnonKey);
const authUrl = () => `${siteConfig.supabaseUrl.replace(/\/+$/, '')}/auth/v1`;

let state: AuthState = { ready: !configured, authenticated: false, twitterUsername: null, error: null };
const listeners = new Set<() => void>();
let startupPromise: Promise<void> | undefined;
let refreshPromise: Promise<string | null> | undefined;
let revision = 0;

function update(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function anonymous(error: string | null = null) {
  localStorage.removeItem(SESSION_KEY);
  update({ ready: true, authenticated: false, twitterUsername: null, error });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof value.accessToken !== 'string' || typeof value.refreshToken !== 'string'
      || typeof value.expiresAt !== 'number' || typeof value.twitterUsername !== 'string') return null;
    return value as StoredSession;
  } catch { return null; }
}

function writeSession(session: StoredSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  update({ ready: true, authenticated: true, twitterUsername: session.twitterUsername, error: null });
}

/** The Twitter handle comes only from the provider identity Supabase Auth stored, never from editable metadata. */
export function twitterHandle(user: AuthUser | undefined): string | null {
  const identity = user?.identities?.find((item) => item.provider === 'twitter');
  const data = identity?.identity_data ?? {};
  const candidate = [data.user_name, data.preferred_username].find((value) => typeof value === 'string') as string | undefined;
  const handle = candidate?.trim().replace(/^@/, '');
  return handle && /^[A-Za-z0-9_]{1,15}$/.test(handle) ? handle : null;
}

async function authRequest(path: string, init: RequestInit & { token?: string } = {}): Promise<unknown> {
  const headers: Record<string, string> = { apikey: siteConfig.supabaseAnonKey, Accept: 'application/json' };
  if (init.body) headers['Content-Type'] = 'application/json';
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const response = await fetch(`${authUrl()}${path}`, { ...init, headers, signal: AbortSignal.timeout(20_000) });
  const body: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error('auth request failed') as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return body;
}

function sessionFromToken(body: TokenResponse): StoredSession {
  if (!body.access_token || !body.refresh_token) throw new Error(cancelledMessage);
  const handle = twitterHandle(body.user);
  if (!handle) throw new Error(twitterMessage);
  const expiresAt = typeof body.expires_at === 'number' ? body.expires_at
    : Math.floor(Date.now() / 1000) + (typeof body.expires_in === 'number' ? body.expires_in : 3600);
  return { accessToken: body.access_token, refreshToken: body.refresh_token, expiresAt, twitterUsername: handle };
}

function randomVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function callbackParameters() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error') ?? hash.get('error');
  const description = url.searchParams.get('error_description') ?? hash.get('error_description');
  const isCallback = Boolean(code || error);
  if (isCallback) {
    // Remove single-use callback parameters from the address bar and history before any request.
    for (const key of ['code', 'error', 'error_code', 'error_description']) url.searchParams.delete(key);
    let fragment = url.hash;
    if (hash.has('error')) {
      for (const key of ['error', 'error_code', 'error_description']) hash.delete(key);
      const rest = hash.toString();
      fragment = rest ? `#${rest}` : '';
    }
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${fragment}`);
  }
  return { code, error, description, isCallback };
}

function initialize() {
  if (!configured) return Promise.resolve();
  startupPromise ??= (async () => {
    const currentRevision = revision;
    const callback = callbackParameters();
    const verifier = localStorage.getItem(VERIFIER_KEY);
    if (callback.isCallback) localStorage.removeItem(VERIFIER_KEY);
    try {
      if (callback.error) throw new Error(cancelledMessage);
      if (callback.code) {
        if (!verifier) throw new Error(cancelledMessage);
        const body = await authRequest('/token?grant_type=pkce', { method: 'POST', body: JSON.stringify({ auth_code: callback.code, code_verifier: verifier }) }) as TokenResponse;
        if (currentRevision === revision) writeSession(sessionFromToken(body));
        return;
      }
      const stored = readSession();
      if (!stored) { if (currentRevision === revision) anonymous(); return; }
      if (stored.expiresAt - 60 > Date.now() / 1000) {
        if (currentRevision === revision) update({ ready: true, authenticated: true, twitterUsername: stored.twitterUsername, error: null });
        return;
      }
      const refreshed = await refresh(stored);
      if (currentRevision === revision) writeSession(refreshed);
    } catch (error) {
      if (currentRevision !== revision) return;
      const message = error instanceof Error && error.message === twitterMessage ? twitterMessage
        : callback.isCallback ? cancelledMessage : null;
      anonymous(message);
    }
  })();
  return startupPromise;
}

async function refresh(stored: StoredSession): Promise<StoredSession> {
  const body = await authRequest('/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: stored.refreshToken }) }) as TokenResponse;
  return sessionFromToken(body);
}

async function login() {
  if (!configured) { anonymous(previewMessage); return; }
  if (!state.ready) return;
  revision += 1;
  update({ ready: false, error: null });
  try {
    const verifier = randomVerifier();
    const challenge = await challengeFor(verifier);
    localStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(RESUME_KEY, '1');
    // Return to this static page so gateway subpaths keep working. The URL must be allowed in Supabase Auth.
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const params = new URLSearchParams({ provider: 'twitter', redirect_to: redirectTo, code_challenge: challenge, code_challenge_method: 's256' });
    window.location.assign(`${authUrl()}/authorize?${params}`);
  } catch {
    update({ ready: true, error: startMessage });
  }
}

async function logout() {
  revision += 1;
  const stored = readSession();
  anonymous();
  if (!stored || !configured) return;
  try { await authRequest('/logout', { method: 'POST', token: stored.accessToken }); }
  catch { /* The local session is already cleared; a server-side revoke failure is not actionable here. */ }
}

async function getAccessToken() {
  if (!configured || !state.authenticated) return null;
  const stored = readSession();
  if (!stored) { anonymous(sessionMessage); return null; }
  if (stored.expiresAt - 60 > Date.now() / 1000) return stored.accessToken;
  const currentRevision = revision;
  refreshPromise ??= (async () => {
    try {
      const refreshed = await refresh(stored);
      if (currentRevision !== revision) return null;
      writeSession(refreshed);
      return refreshed.accessToken;
    } catch {
      if (currentRevision === revision) anonymous(sessionMessage);
      return null;
    } finally { refreshPromise = undefined; }
  })();
  return refreshPromise;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state);
  useEffect(() => {
    void initialize();
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_KEY || !state.ready) return;
      const stored = readSession();
      if (!stored && state.authenticated) anonymous();
      else if (stored && stored.twitterUsername !== state.twitterUsername) update({ authenticated: true, twitterUsername: stored.twitterUsername, error: null });
    };
    const onPageShow = (event: PageTransitionEvent) => {
      // Returning from a cancelled redirect may restore this page from the back-forward cache.
      if (event.persisted && !state.ready) update({ ready: true, error: cancelledMessage });
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);
  return <AuthContext.Provider value={{ ...snapshot, login, logout, getAccessToken }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
