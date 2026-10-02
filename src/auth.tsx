import { createContext, useContext, useEffect, useSyncExternalStore, type PropsWithChildren } from 'react';
import type Privy from '@privy-io/js-sdk-core';
import { siteConfig } from './config';

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

type PrivyUser = Awaited<ReturnType<Privy['user']['get']>>['user'];
const previewMessage = 'Twitter sign-in is not available in this preview. Please check back when the directory launches.';
const sessionMessage = 'Your session could not be verified. Sign in with Twitter again.';
const twitterMessage = 'A verified Twitter account is required. Please sign in with Twitter again.';
let state: AuthState = {
  ready: !siteConfig.privyAppId,
  authenticated: false,
  twitterUsername: null,
  error: null,
};
const listeners = new Set<() => void>();
let clientPromise: Promise<Privy> | undefined;
let startupPromise: Promise<void> | undefined;
let refreshPromise: Promise<void> | undefined;
let revision = 0;

function update(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function anonymous(error: string | null = null) {
  update({ ready: true, authenticated: false, twitterUsername: null, error });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

async function getClient(): Promise<Privy> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { default: PrivyClient } = await import('@privy-io/js-sdk-core');
      // Namespace SDK session and PKCE state to this app. The SDK owns their lifecycle.
      const prefix = `pond:privy:${siteConfig.privyAppId}:`;
      const client = new PrivyClient({
        appId: siteConfig.privyAppId,
        clientId: siteConfig.privyClientId || undefined,
        sessions: { cookieWriteBehavior: 'never' },
        storage: {
          get: (key) => {
            const value = localStorage.getItem(prefix + key);
            return value === null ? undefined : JSON.parse(value) as unknown;
          },
          put: (key, value) => {
            if (value === undefined) localStorage.removeItem(prefix + key);
            else localStorage.setItem(prefix + key, JSON.stringify(value));
          },
          del: (key) => localStorage.removeItem(prefix + key),
          getKeys: () => Object.keys(localStorage)
            .filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length)),
        },
      });
      await client.initialize();
      return client;
    })().catch((error: unknown) => {
      clientPromise = undefined;
      throw error;
    });
  }
  return clientPromise;
}

function acceptUser(user: PrivyUser) {
  const twitter = user.linked_accounts.find((account) => account.type === 'twitter_oauth');
  const username = twitter?.username?.trim();
  if (!username) throw new Error(twitterMessage);
  update({ ready: true, authenticated: true, twitterUsername: username, error: null });
}

function callbackParameters() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('privy_oauth_code');
  const oauthState = url.searchParams.get('privy_oauth_state');
  const provider = url.searchParams.get('privy_oauth_provider');
  const error = url.searchParams.get('privy_oauth_error');
  const isCallback = [...url.searchParams.keys()].some((key) => key.startsWith('privy_oauth_'));
  if (isCallback) {
    // Clear sensitive, single-use callback parameters from history before making requests.
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('privy_oauth_')) url.searchParams.delete(key);
    }
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }
  return { code, oauthState, provider, error, isCallback };
}

function initialize() {
  if (!siteConfig.privyAppId) return Promise.resolve();
  startupPromise ??= (async () => {
    const currentRevision = revision;
    const callback = callbackParameters();
    try {
      if (callback.isCallback && (callback.error || !callback.code || callback.code === 'undefined' || !callback.oauthState ||
          (callback.provider && callback.provider !== 'twitter'))) {
        throw new Error('Twitter sign-in was not completed. Please try again.');
      }
      const client = await getClient();
      if (callback.code && callback.oauthState) {
        const result = await client.auth.oauth.loginWithCode(
          callback.code, callback.oauthState, 'twitter', undefined, 'login-or-sign-up',
          { embedded: { ethereum: { createOnLogin: 'off' }, solana: { createOnLogin: 'off' } } },
        );
        if (currentRevision === revision) acceptUser(result.user);
      } else if (await client.getAccessToken()) {
        const { user } = await client.user.refreshUser();
        if (currentRevision === revision) acceptUser(user);
      } else if (currentRevision === revision) anonymous();
    } catch (error) {
      if (currentRevision !== revision) return;
      const message = error instanceof Error && error.message === twitterMessage ? twitterMessage
        : callback.isCallback ? 'Twitter sign-in was not completed. Please try again.'
          : 'We could not connect to Twitter sign-in. Please try again.';
      anonymous(message);
    }
  })();
  return startupPromise;
}

async function refreshSession() {
  if (!siteConfig.privyAppId || !state.ready || refreshPromise) return;
  const currentRevision = revision;
  refreshPromise = (async () => {
    try {
      const client = await getClient();
      const token = await client.getAccessToken();
      if (currentRevision !== revision) return;
      if (!token) {
        if (state.authenticated) anonymous(sessionMessage);
        return;
      }
      const { user } = await client.user.refreshUser();
      if (currentRevision === revision) acceptUser(user);
    } catch {
      if (currentRevision === revision && state.authenticated) anonymous(sessionMessage);
    } finally { refreshPromise = undefined; }
  })();
  return refreshPromise;
}

async function login() {
  if (!siteConfig.privyAppId) { anonymous(previewMessage); return; }
  if (!state.ready) return;
  revision += 1;
  update({ ready: false, error: null });
  try {
    const client = await getClient();
    // Use the existing static page as the callback so gateway subpaths also work.
    const redirectUrl = `${window.location.origin}${window.location.pathname}`;
    const { url } = await client.auth.oauth.generateURL('twitter', redirectUrl);
    window.location.assign(url);
  } catch {
    update({ ready: true, error: 'We could not start Twitter sign-in. Please try again.' });
  }
}

async function logout() {
  revision += 1;
  anonymous();
  if (!clientPromise) return;
  try { await (await clientPromise).auth.logout(); }
  catch {
    const message = 'Sign-out could not finish. Please retry before leaving this shared device.';
    update({ error: message });
    throw new Error(message);
  }
}

async function getAccessToken() {
  if (!siteConfig.privyAppId || !state.authenticated) return null;
  const currentRevision = revision;
  try {
    const token = await (await getClient()).getAccessToken();
    if (currentRevision !== revision) return null;
    if (!token) anonymous(sessionMessage);
    return token;
  } catch {
    if (currentRevision === revision) anonymous(sessionMessage);
    return null;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state);
  useEffect(() => {
    void initialize();
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshSession(); };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith(`pond:privy:${siteConfig.privyAppId}:`)) void refreshSession();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      // Returning from a cancelled redirect may restore this page from the back-forward cache.
      if (event.persisted && !state.ready) {
        update({ ready: true, error: 'Twitter sign-in was not completed. Please try again.' });
        void refreshSession();
      }
    };
    window.addEventListener('focus', onVisible);
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(onVisible, 60_000);
    return () => {
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, []);
  return <AuthContext.Provider value={{ ...snapshot, login, logout, getAccessToken }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
