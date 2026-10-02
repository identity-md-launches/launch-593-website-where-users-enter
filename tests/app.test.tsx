import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

const mocks = vi.hoisted(() => ({
  auth: {
    ready: true, authenticated: false, twitterUsername: null as string | null, error: null as string | null,
    login: vi.fn(), logout: vi.fn(), getAccessToken: vi.fn(),
  },
}));
vi.mock('../src/auth', () => ({ useAuth: () => mocks.auth, RESUME_KEY: 'pepe:auth:resume' }));
vi.mock('../src/config', () => ({ hasBackend: false, backendConfig: { url: '', anonKey: '' } }));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.auth.authenticated = false;
  mocks.auth.twitterUsername = null;
});

describe('single-action page', () => {
  it('shows only the submit action over the decorative artwork', () => {
    render(<App />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Submit a project' })).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent(/^Pepe CollectiveSubmit a project$/);
    expect(screen.getByRole('heading', { level: 1, name: 'Pepe Collective' })).toHaveClass('sr-only');
    expect(document.querySelector('.backdrop')).toHaveAttribute('aria-hidden', 'true');
    expect(document.querySelector('.backdrop img')).toHaveAttribute('alt', '');
  });

  it('opens the Twitter verification step, closes from the dialog and restores focus', async () => {
    const user = userEvent.setup();
    render(<App />);
    const trigger = screen.getByRole('button', { name: 'Submit a project' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Submit a project' });
    await user.click(within(dialog).getByRole('button', { name: 'Verify with Twitter' }));
    expect(mocks.auth.login).toHaveBeenCalledOnce();
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
    // jsdom does not dispatch the native dialog cancel event for Escape; the browser check covers that path.
    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('reopens the dialog once after returning from Twitter and shows the form for a verified account', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('pepe:auth:resume', '1');
    mocks.auth.authenticated = true;
    mocks.auth.twitterUsername = 'verified_pepe';
    render(<App />);
    const dialog = screen.getByRole('dialog', { name: 'Submit a project' });
    expect(within(dialog).getByRole('textbox', { name: /^Twitter account/ })).toHaveValue('@verified_pepe');
    expect(sessionStorage.getItem('pepe:auth:resume')).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
