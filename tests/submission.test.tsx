import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Submission } from '../src/components/Submission';
import type { Project } from '../src/lib/submissions';

const mocks = vi.hoisted(() => ({
  auth: {
    ready: true, authenticated: true, twitterUsername: 'real_builder' as string | null, error: null as string | null,
    login: vi.fn(), logout: vi.fn(), getAccessToken: vi.fn(),
  },
  submit: vi.fn(),
  config: { url: 'https://configured.example', anonKey: 'public-test-key' },
}));
vi.mock('../src/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('../src/config', () => ({ hasBackend: true, backendConfig: mocks.config }));
vi.mock('../src/lib/submissions', async (importOriginal) => ({ ...await importOriginal<typeof import('../src/lib/submissions')>(), submitProject: mocks.submit }));

const contract = `0x${'ab'.repeat(20)}`;
const wallet = `0x${'cd'.repeat(20)}`;
const description = 'A cooperative of builders creating useful open AI tools.';
const persisted: Project = { id: 'server-issued-id', projectUsername: 'pond_tools', twitterUsername: 'real_builder', contract, wallet, description, createdAt: '2026-10-02T12:00:00.000Z' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.submit.mockReset();
  Object.assign(mocks.auth, { ready: true, authenticated: true, twitterUsername: 'real_builder', error: null });
  mocks.auth.getAccessToken.mockResolvedValue('verified-session-token');
  mocks.auth.login.mockResolvedValue(undefined);
});

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: /^Project username/ }), ' @pond_tools ');
  await user.type(screen.getByRole('textbox', { name: /^Contract address/ }), contract);
  await user.type(screen.getByRole('textbox', { name: /^About your project/ }), ` ${description} `);
  await user.type(screen.getByRole('textbox', { name: /^Wallet address/ }), wallet);
}

function renderForm() {
  const onClose = vi.fn();
  render(<Submission onClose={onClose} />);
  return { onClose };
}

describe('Twitter-verified public submission', () => {
  it.each([
    { authenticated: false, twitterUsername: null },
    { authenticated: true, twitterUsername: null },
  ])('keeps the form behind a verified Twitter account: %j', async (identity) => {
    Object.assign(mocks.auth, identity);
    const user = userEvent.setup();
    renderForm();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit project' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Verify with Twitter' }));
    expect(mocks.auth.login).toHaveBeenCalledOnce();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('requires complete valid fields and explicit public visibility consent', async () => {
    const user = userEvent.setup();
    renderForm();
    const twitter = screen.getByRole('textbox', { name: /^Twitter account/ });
    expect(twitter).toHaveValue('@real_builder');
    expect(twitter).toHaveAttribute('readonly');
    await user.click(screen.getByRole('button', { name: 'Submit project' }));
    for (const name of [/^Project username/, /^Contract address/, /^About your project/, /^Wallet address/]) {
      expect(screen.getByRole('textbox', { name })).toHaveAttribute('aria-invalid', 'true');
    }
    await waitFor(() => expect(screen.getByRole('textbox', { name: /^Project username/ })).toHaveFocus());
    expect(screen.getByText('Confirm that you want to make these details public.')).toBeVisible();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Submit project' }));
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.auth.getAccessToken).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('publishes only after server success, with normalized input and the access token', async () => {
    const user = userEvent.setup();
    let resolveSubmission!: (project: Project) => void;
    mocks.submit.mockImplementation(() => new Promise<Project>((resolve) => { resolveSubmission = resolve; }));
    const { onClose } = renderForm();
    await fillForm(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Submit project' }));
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledOnce());
    expect(mocks.submit).toHaveBeenCalledWith(mocks.config, { projectUsername: 'pond_tools', contract, wallet, description }, 'verified-session-token');
    expect(screen.getByRole('button', { name: 'Submitting project…' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /^Project username/ })).toBeDisabled();
    expect(screen.queryByText('Project submitted')).not.toBeInTheDocument();
    await act(async () => { resolveSubmission(persisted); });
    expect(screen.getByRole('heading', { name: 'Project submitted' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps every entered detail after a failed save and supports retry', async () => {
    const user = userEvent.setup();
    mocks.submit.mockRejectedValueOnce(new Error('The public directory is unavailable. Please try again.')).mockResolvedValueOnce(persisted);
    renderForm();
    await fillForm(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Submit project' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The public directory is unavailable. Please try again.');
    expect(screen.getByRole('textbox', { name: /^Project username/ })).toHaveValue(' @pond_tools ');
    expect(screen.getByRole('textbox', { name: /^Contract address/ })).toHaveValue(contract);
    expect(screen.getByRole('textbox', { name: /^About your project/ })).toHaveValue(` ${description} `);
    expect(screen.getByRole('textbox', { name: /^Wallet address/ })).toHaveValue(wallet);
    expect(screen.getByRole('checkbox')).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Submit project' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Project submitted' })).toBeVisible());
    expect(mocks.submit).toHaveBeenCalledTimes(2);
  });

  it('does not contact the submission endpoint when the session token has expired', async () => {
    const user = userEvent.setup();
    mocks.auth.getAccessToken.mockResolvedValue(null);
    renderForm();
    await fillForm(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Submit project' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your session has expired.');
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: /^Project username/ })).toHaveValue(' @pond_tools ');
  });
});
