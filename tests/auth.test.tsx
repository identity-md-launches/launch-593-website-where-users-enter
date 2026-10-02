import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  config: { privyAppId: '', privyClientId: '', supabaseUrl: '', supabaseAnonKey: '' },
  initialize: vi.fn(), getAccessToken: vi.fn(), refreshUser: vi.fn(),
  loginWithCode: vi.fn(), generateURL: vi.fn(), logout: vi.fn(),
}));
vi.mock('../src/config', () => ({ siteConfig: fixture.config }));
vi.mock('@privy-io/js-sdk-core', () => ({
  default: class {
    initialize = fixture.initialize;
    getAccessToken = fixture.getAccessToken;
    user = { refreshUser: fixture.refreshUser };
    auth = { oauth: { loginWithCode: fixture.loginWithCode, generateURL: fixture.generateURL }, logout: fixture.logout };
  },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  fixture.config.privyAppId = '';
  fixture.initialize.mockResolvedValue(undefined);
  fixture.getAccessToken.mockResolvedValue(null);
  fixture.refreshUser.mockResolvedValue({ user: { linked_accounts: [{ type: 'twitter_oauth', username: 'fixture_pepe' }] } });
  fixture.loginWithCode.mockResolvedValue({ user: { linked_accounts: [{ type: 'twitter_oauth', username: 'fixture_pepe' }] } });
  fixture.logout.mockResolvedValue(undefined);
  fixture.generateURL.mockRejectedValue(new Error('Fixture network unavailable'));
  window.history.replaceState({}, '', '/gateway/index.html');
});
afterEach(cleanup);

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

describe('Privy Twitter adapter using mocked SDK fixtures', () => {
  it('fails closed without configuration and never loads a login identity', async () => {
    await mount();
    fireEvent.click(screen.getByText('Login'));
    expect(screen.getByRole('status').textContent).toContain('not available in this preview');
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(fixture.initialize).not.toHaveBeenCalled();
  });

  it('initializes once under React StrictMode and stays anonymous without a session', async () => {
    fixture.config.privyAppId = 'fixture-app';
    await mount();
    expect(fixture.initialize).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('restores a verified Twitter session and clears the form identity on logout', async () => {
    fixture.config.privyAppId = 'fixture-app';
    fixture.getAccessToken.mockResolvedValue('fixture-token');
    const getToken = await mount();
    expect(screen.getByTestId('username').textContent).toBe('fixture_pepe');
    fireEvent.click(screen.getByText('Token'));
    await waitFor(() => expect(getToken()).toBe('fixture-token'));
    fireEvent.click(screen.getByText('Logout'));
    await waitFor(() => expect(fixture.logout).toHaveBeenCalledOnce());
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('username').textContent).toBe('');
  });

  it('rejects a Privy account without a Twitter identity', async () => {
    fixture.config.privyAppId = 'fixture-app';
    fixture.getAccessToken.mockResolvedValue('fixture-token');
    fixture.refreshUser.mockResolvedValue({ user: { linked_accounts: [{ type: 'email', address: 'fixture@example.test' }] } });
    await mount();
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByRole('status').textContent).toContain('verified Twitter account is required');
  });

  it('exchanges callback through the SDK with wallet creation off and removes callback secrets', async () => {
    fixture.config.privyAppId = 'fixture-app';
    window.history.replaceState({}, '', '/gateway/index.html?keep=1&privy_oauth_code=fixture-code&privy_oauth_state=fixture-state&privy_oauth_provider=twitter#join');
    await mount();
    expect(fixture.loginWithCode).toHaveBeenCalledExactlyOnceWith('fixture-code', 'fixture-state', 'twitter', undefined, 'login-or-sign-up',
      { embedded: { ethereum: { createOnLogin: 'off' }, solana: { createOnLogin: 'off' } } });
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/gateway/index.html?keep=1#join');
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
  });

  it('rejects a cancelled callback before exchanging any code', async () => {
    fixture.config.privyAppId = 'fixture-app';
    window.history.replaceState({}, '', '/gateway/index.html?privy_oauth_code=undefined&privy_oauth_state=fixture-state&privy_oauth_provider=twitter');
    await mount();
    expect(fixture.loginWithCode).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('not completed');
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('keeps the user signed out when the SDK rejects callback state', async () => {
    fixture.config.privyAppId = 'fixture-app';
    window.history.replaceState({}, '', '/gateway/index.html?privy_oauth_code=fixture-code&privy_oauth_state=bad-state&privy_oauth_provider=twitter');
    fixture.loginWithCode.mockRejectedValueOnce(new Error('pkce_state_code_mismatch'));
    await mount();
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByRole('status').textContent).toContain('not completed');
  });

  it('clears identity if access-token refresh expires', async () => {
    fixture.config.privyAppId = 'fixture-app';
    fixture.getAccessToken.mockResolvedValue('fixture-token');
    await mount();
    fixture.getAccessToken.mockResolvedValue(null);
    await act(async () => { fireEvent.click(screen.getByText('Token')); });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByRole('status').textContent).toContain('session could not be verified');
  });

  it('keeps the static callback subpath when starting Twitter OAuth and recovers a start failure', async () => {
    fixture.config.privyAppId = 'fixture-app';
    await mount();
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(fixture.generateURL).toHaveBeenCalledOnce());
    expect(fixture.generateURL).toHaveBeenCalledWith('twitter', `${window.location.origin}/gateway/index.html`);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('could not start'));
    expect(screen.getByTestId('ready').textContent).toBe('true');
  });
});
