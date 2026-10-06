import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Submission } from '../src/components/Submission';
import type { Project } from '../src/lib/submissions';

const mocks = vi.hoisted(() => ({
  configured: true,
  submit: vi.fn(),
  config: { url: 'https://configured.example', anonKey: 'public-test-key' },
}));
vi.mock('../src/config', () => ({ get hasBackend() { return mocks.configured; }, backendConfig: mocks.config }));
vi.mock('../src/lib/submissions', () => ({ submitProject: mocks.submit }));

const contract = `0x${'ab'.repeat(20)}`;
const wallet = `0x${'cd'.repeat(20)}`;
const description = 'A cooperative of builders creating useful open AI tools.';
const persisted: Project = { id: 'server-issued-id', projectUsername: 'pond_tools', twitterUsername: 'real_builder', contract, wallet, description, createdAt: '2026-10-02T12:00:00.000Z' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.submit.mockReset();
  mocks.configured = true;
});

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: /^Twitter account/ }), '@real_builder');
  await user.type(screen.getByRole('textbox', { name: /^Project username/ }), ' @pond_tools ');
  await user.type(screen.getByRole('textbox', { name: /^Contract address/ }), contract);
  await user.type(screen.getByRole('textbox', { name: /^About your project/ }), ` ${description} `);
  await user.type(screen.getByRole('textbox', { name: /^Wallet address/ }), wallet);
}

function renderForm() {
  const onPublished = vi.fn();
  const onClose = vi.fn();
  render(<Submission onPublished={onPublished} onClose={onClose} />);
  return { onPublished, onClose };
}

describe('public submission without sign-in', () => {
  it('requires complete valid fields and explicit public visibility consent', async () => {
    const user = userEvent.setup();
    const { onPublished } = renderForm();
    const twitter = screen.getByRole('textbox', { name: /^Twitter account/ });
    expect(twitter).toHaveValue('');
    expect(twitter).not.toHaveAttribute('readonly');
    await user.click(screen.getByRole('button', { name: 'Publish project' }));
    for (const name of [/^Twitter account/, /^Project username/, /^Contract address/, /^About your project/, /^Wallet address/]) {
      expect(screen.getByRole('textbox', { name })).toHaveAttribute('aria-invalid', 'true');
    }
    await waitFor(() => expect(twitter).toHaveFocus());
    expect(screen.getByText('Confirm that you want to make these details public.')).toBeVisible();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Publish project' }));
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(onPublished).not.toHaveBeenCalled();
  });

  it('publishes only after server success, with normalized self-reported details', async () => {
    const user = userEvent.setup();
    let resolveSubmission!: (project: Project) => void;
    mocks.submit.mockImplementation(() => new Promise<Project>((resolve) => { resolveSubmission = resolve; }));
    const { onPublished, onClose } = renderForm();
    await fillForm(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Publish project' }));
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledOnce());
    expect(mocks.submit).toHaveBeenCalledWith(mocks.config, { twitterUsername: 'real_builder', projectUsername: 'pond_tools', contract, wallet, description });
    expect(screen.getByRole('button', { name: 'Publishing project…' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /^Project username/ })).toBeDisabled();
    expect(onPublished).not.toHaveBeenCalled();
    expect(screen.queryByText('You’re in the pond.')).not.toBeInTheDocument();
    await act(async () => { resolveSubmission(persisted); });
    expect(onPublished).toHaveBeenCalledExactlyOnceWith(persisted);
    expect(screen.getByRole('heading', { name: 'You’re in the pond.' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Explore the collective' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps every entered detail after a failed save and supports retry', async () => {
    const user = userEvent.setup();
    mocks.submit.mockRejectedValueOnce(new Error('The public directory is unavailable. Please try again.')).mockResolvedValueOnce(persisted);
    const { onPublished } = renderForm();
    await fillForm(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Publish project' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The public directory is unavailable. Please try again.');
    expect(screen.getByRole('textbox', { name: /^Project username/ })).toHaveValue(' @pond_tools ');
    expect(screen.getByRole('textbox', { name: /^Contract address/ })).toHaveValue(contract);
    expect(screen.getByRole('textbox', { name: /^About your project/ })).toHaveValue(` ${description} `);
    expect(screen.getByRole('textbox', { name: /^Wallet address/ })).toHaveValue(wallet);
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(onPublished).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Publish project' }));
    await waitFor(() => expect(onPublished).toHaveBeenCalledExactlyOnceWith(persisted));
    expect(mocks.submit).toHaveBeenCalledTimes(2);
  });

  it('does not send or pretend to publish when services are unconfigured', async () => {
    mocks.configured = false;
    const user = userEvent.setup();
    const { onPublished } = renderForm();
    await fillForm(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Publish project' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your details have not been submitted.');
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(onPublished).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: /^Twitter account/ })).toHaveValue('@real_builder');
  });
});
