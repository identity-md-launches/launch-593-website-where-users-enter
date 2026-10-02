import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  config: { supabaseUrl: '', supabaseAnonKey: '' },
  fetch: vi.fn<typeof fetch>(),
  assign: vi.fn<(url: string) => void>(),
}));
vi.mock('../src/config', () => ({ siteConfig: fixture.config }));

const SESSION_KEY = 'pepe:auth:session';
const VERIFIER_KEY = 'pepe:auth:verifier';
const twitterUser = { id: 'user-1', identities: [{ provider: 'twitter', identity_data: { user_name: 'fixture_pepe', name: 'Fixture Pepe' } }], user_metadata: { user_name: 'spoofed' } };
const tokenResponse = (user: unknown = twitterUser) => Response.json({ access_token: 'fresh-token', refresh_token: 'fresh-refresh', expires_in: 3600, token_type: 'bearer', user });
const futureSession = { accessToken: 'stored-token', refreshToken: 'stored-refresh', expiresAt: Math.floor(Date.now() / 1000) + 3000, twitterUsername: 'stored_pepe' };

function setLocation(path: string) {
  const url = new URL(path, 'https://pond.example');
  const location = {
    get href() { return url.href; }, get origin() { return url.origin; }, get pathname() { return url.pathname; },
    get search() { return url.search; }, get hash() { return url.hash; }, assign: fixture.assign,
  };
  Object.defineProperty(window, 'location', { value: location, writable: true, configurable: true });
  window.history.replaceState = (state: unknown, _title: string, next?: string | URL | null) => {
    if (next != null) { const resolved = new URL(String(next), url.href); url.pathname = resolved.pathname; url.search = resolved.search; url.hash = resolved.hash; }
    void state;
  };
}
const currentLocation = () => window.location.pathname + window.location.search + window.location.hash;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  fixture.config.supabaseUrl = '';
  fixture.config.supabaseAnonKey = '';
  fixture.fetch.mockRejectedValue(new Error('unexpected fetch'));
  vi.stubGlobal('fetch', fixture.fetch);
  setLocation('/gateway/index.html');
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function configure() { fixture.config.supabaseUrl = 'https://fixture.supabase.co'; fixture.config.supabaseAnonKey = 'public-anon-key'; }

async function mount() {
  const { AuthProvider, useAuth } = await import('../src/auth');
  let token: string | null = null;
  function Probe() {
    const auth = useAuth();
    return <>
      <span data-testid="ready">{String(auth.ready)}</span>
      <span data-testid="authenticated">{String(auth.authenticated)}</span>
      <span data-testid="username">{auth.twitterUsername}</span>
      <span role="status">{auth.error}</span>
      <button onClick={() => void auth.login()}>Login</button>
      <button onClick={() => void auth.logout()}>Logout</button>
      <button onClick={() => void auth.getAccessToken().then((value) => { token = value; })}>Token</button>
    </>;
  }
  render(<StrictMode><AuthProvider><Probe /></AuthProvider></StrictMode>);
  await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
  return () => token;
}

describe('Twitter verification through Supabase Auth', () => {
  it('fails closed without configuration and never contacts a server', async () => {
    await mount();
    fireEvent.click(screen.getByText('Login'));
    expect(screen.getByRole('status').textContent).toContain('not available in this preview');
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(fixture.fetch).not.toHaveBeenCalled();
    expect(fixture.assign).not.toHaveBeenCalled();
  });

  it('stays anonymous with no stored session and no callback, without a request', async () => {
    configure();
    await mount();
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(fixture.fetch).not.toHaveBeenCalled();
  });

  it('restores an unexpired stored session offline, hands out its token and signs out on the server', async () => {
    configure();
    localStorage.setItem(SESSION_KEY, JSON.stringify(futureSession));
    fixture.fetch.mockResolvedValue(new Response(null, { status: 204 }));
    const getToken = await mount();
    expect(screen.getByTestId('username').textContent).toBe('stored_pepe');
    fireEvent.click(screen.getByText('Token'));
    await waitFor(() => expect(getToken()).toBe('stored-token'));
    expect(fixture.fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Logout'));
    await waitFor(() => expect(fixture.fetch).toHaveBeenCalledOnce());
    const [url, init] = fixture.fetch.mock.calls[0];
    expect(String(url)).toBe('https://fixture.supabase.co/auth/v1/logout');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer stored-token');
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('refreshes an expired stored session and keeps the handle from the Twitter identity only', async () => {
    configure();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...futureSession, expiresAt: Math.floor(Date.now() / 1000) - 10 }));
    fixture.fetch.mockResolvedValueOnce(tokenResponse());
    await mount();
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('username').textContent).toBe('fixture_pepe');
    const [url, init] = fixture.fetch.mock.calls[0];
    expect(String(url)).toBe('https://fixture.supabase.co/auth/v1/token?grant_type=refresh_token');
    expect(JSON.parse(String(init?.body))).toEqual({ refresh_token: 'stored-refresh' });
    expect(new Headers(init?.headers).get('apikey')).toBe('public-anon-key');
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!).accessToken).toBe('fresh-token');
  });

  it('clears the session when a refresh fails while requesting a token', async () => {
    configure();
    localStorage.setItem(SESSION_KEY, JSON.stringify(futureSession));
    await mount();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...futureSession, expiresAt: Math.floor(Date.now() / 1000) - 10 }));
    fixture.fetch.mockResolvedValueOnce(Response.json({ error: 'invalid_grant' }, { status: 400 }));
    await act(async () => { fireEvent.click(screen.getByText('Token')); });
    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('false'));
    expect(screen.getByRole('status').textContent).toContain('verification expired');
  });

  it('exchanges the OAuth callback code with the stored PKCE verifier and removes it from the URL', async () => {
    configure();
    localStorage.setItem(VERIFIER_KEY, 'fixture-verifier');
    setLocation('/gateway/index.html?keep=1&code=fixture-code#join');
    fixture.fetch.mockResolvedValueOnce(tokenResponse());
    await mount();
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('username').textContent).toBe('fixture_pepe');
    const [url, init] = fixture.fetch.mock.calls[0];
    expect(String(url)).toBe('https://fixture.supabase.co/auth/v1/token?grant_type=pkce');
    expect(JSON.parse(String(init?.body))).toEqual({ auth_code: 'fixture-code', code_verifier: 'fixture-verifier' });
    expect(currentLocation()).toBe('/gateway/index.html?keep=1#join');
    expect(localStorage.getItem(VERIFIER_KEY)).toBeNull();
    expect(fixture.fetch).toHaveBeenCalledOnce();
  });

  it('rejects a cancelled or verifier-less callback before exchanging anything', async () => {
    configure();
    setLocation('/gateway/index.html?error=access_denied&error_description=User+cancelled');
    await mount();
    expect(fixture.fetch).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('not completed');
    expect(currentLocation()).toBe('/gateway/index.html');
    cleanup(); vi.resetModules();
    setLocation('/gateway/index.html?code=orphan-code');
    await mount();
    expect(fixture.fetch).not.toHaveBeenCalled();
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByRole('status').textContent).toContain('not completed');
  });

  it('rejects a session whose user has no Twitter identity, ignoring editable metadata', async () => {
    configure();
    localStorage.setItem(VERIFIER_KEY, 'fixture-verifier');
    setLocation('/gateway/index.html?code=fixture-code');
    fixture.fetch.mockResolvedValueOnce(tokenResponse({ id: 'user-2', identities: [{ provider: 'email', identity_data: { email: 'a@example.test' } }], user_metadata: { user_name: 'spoofed' } }));
    await mount();
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByRole('status').textContent).toContain('Twitter account is required');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('starts Twitter OAuth with PKCE, returning to the static page path, and remembers to resume', async () => {
    configure();
    await mount();
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(fixture.assign).toHaveBeenCalledOnce());
    const target = new URL(fixture.assign.mock.calls[0][0]);
    expect(target.origin + target.pathname).toBe('https://fixture.supabase.co/auth/v1/authorize');
    expect(target.searchParams.get('provider')).toBe('twitter');
    expect(target.searchParams.get('redirect_to')).toBe('https://pond.example/gateway/index.html');
    expect(target.searchParams.get('code_challenge_method')).toBe('s256');
    expect(target.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(localStorage.getItem(VERIFIER_KEY)).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(sessionStorage.getItem('pepe:auth:resume')).toBe('1');
    expect(fixture.fetch).not.toHaveBeenCalled();
  });
});
