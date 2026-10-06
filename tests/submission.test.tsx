import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Submission } from '../src/components/Submission';
import type { Project } from '../src/services/directory';

const mocks = vi.hoisted(() => ({
  usesPublicNetwork: true,
  submit: vi.fn(),
  config: { url: 'https://configured.example', anonKey: 'public-test-key' },
}));
vi.mock('../src/config', () => ({ get usesPublicNetwork() { return mocks.usesPublicNetwork; }, backendConfig: mocks.config }));
vi.mock('../src/services/directory', () => ({ submitProject: mocks.submit }));

const contract = `0x${'ab'.repeat(20)}`;
const description = 'A cooperative of builders creating useful open AI tools.';
const persisted: Project = { id: 'server-issued-id', projectUsername: 'pond_tools', twitterUsername: 'real_builder', contract, description, createdAt: '2026-10-02T12:00:00.000Z' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.submit.mockReset();
  mocks.usesPublicNetwork = true;
});

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: /^Personal Twitter account/ }), '@real_builder');
  await user.type(screen.getByRole('textbox', { name: /^Project Twitter account/ }), ' @pond_tools ');
  await user.type(screen.getByRole('textbox', { name: /^Contract address/ }), contract);
  await user.type(screen.getByRole('textbox', { name: /^About your project/ }), ` ${description} `);
}

function renderForm() {
  const onPublished = vi.fn();
  const onClose = vi.fn();
  render(<Submission onPublished={onPublished} onClose={onClose} />);
  return { onPublished, onClose };
}

describe('public submission without sign-in', () => {
  it('publishes with personal Twitter blank while keeping the other three fields required', async () => {
    const user = userEvent.setup();
    mocks.submit.mockResolvedValue({ ...persisted, twitterUsername: '' });
    const { onPublished } = renderForm();
    await fillForm(user);
    await user.clear(screen.getByRole('textbox', { name: /^Personal Twitter account/ }));
    for (const name of [/^Project Twitter account/, /^Contract address/, /^About your project/]) {
      expect(screen.getByRole('textbox', { name })).toBeRequired();
    }
    expect(screen.queryByRole('textbox', { name: /wallet/i })).not.toBeInTheDocument();
    expect(screen.getByText('Rewards will be sent directly to the winners deployer addresses')).toBeVisible();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Publish project' }));
    await waitFor(() => expect(onPublished).toHaveBeenCalledWith({ ...persisted, twitterUsername: '' }));
    expect(mocks.submit).toHaveBeenCalledWith(mocks.config, { twitterUsername: '', projectUsername: 'pond_tools', contract, description });
  });

  it('rejects malformed optional personal and required project Twitter handles', async () => {
    const user = userEvent.setup(); renderForm();
    await fillForm(user);
    const personal = screen.getByRole('textbox', { name: /^Personal Twitter account/ });
    const project = screen.getByRole('textbox', { name: /^Project Twitter account/ });
    await user.clear(personal); await user.type(personal, '@');
    await user.clear(project); await user.type(project, 'bad-handle');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Publish project' }));
    expect(personal).toHaveAttribute('aria-invalid', 'true');
    expect(project).toHaveAttribute('aria-invalid', 'true');
    expect(personal).toHaveFocus();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('rejects an overlong pasted address instead of silently truncating it to another address', async () => {
    const user = userEvent.setup();
    renderForm();
    const address = screen.getByRole('textbox', { name: /^Contract address/ });
    await user.click(address);
    await user.paste(`${contract}1234`);
    await user.click(screen.getByRole('button', { name: 'Publish project' }));
    expect(address).toHaveValue(`${contract}1234`);
    expect(address).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('requires complete valid fields and explicit public visibility consent', async () => {
    const user = userEvent.setup();
    const { onPublished } = renderForm();
    const twitter = screen.getByRole('textbox', { name: /^Personal Twitter account/ });
    expect(twitter).toHaveValue('');
    expect(twitter).not.toHaveAttribute('readonly');
    await user.click(screen.getByRole('button', { name: 'Publish project' }));
    for (const name of [/^Project Twitter account/, /^Contract address/, /^About your project/]) {
      expect(screen.getByRole('textbox', { name })).toHaveAttribute('aria-invalid', 'true');
    }
    expect(twitter).toHaveAttribute('aria-invalid', 'false');
    expect(twitter).not.toBeRequired();
    await waitFor(() => expect(screen.getByRole('textbox', { name: /^Project Twitter account/ })).toHaveFocus());
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
    expect(mocks.submit).toHaveBeenCalledWith(mocks.config, { twitterUsername: 'real_builder', projectUsername: 'pond_tools', contract, description });
    expect(screen.getByRole('button', { name: 'Publishing project…' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /^Project Twitter account/ })).toBeDisabled();
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
    expect(screen.getByRole('textbox', { name: /^Project Twitter account/ })).toHaveValue(' @pond_tools ');
    expect(screen.getByRole('textbox', { name: /^Contract address/ })).toHaveValue(contract);
    expect(screen.getByRole('textbox', { name: /^About your project/ })).toHaveValue(` ${description} `);
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(onPublished).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Publish project' }));
    await waitFor(() => expect(onPublished).toHaveBeenCalledExactlyOnceWith(persisted));
    expect(mocks.submit).toHaveBeenCalledTimes(2);
  });

  it('publishes through the public network without Supabase credentials', async () => {
    const user = userEvent.setup();
    mocks.submit.mockResolvedValue(persisted);
    const { onPublished } = renderForm();
    expect(screen.getByText(/Shared on a public network/)).toBeVisible();
    expect(screen.queryByText(/Publishing is not available yet/)).not.toBeInTheDocument();
    await fillForm(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Publish project' }));
    await waitFor(() => expect(onPublished).toHaveBeenCalledExactlyOnceWith(persisted));
    expect(screen.getByRole('button', { name: 'Explore the collective' })).toHaveFocus();
  });
});
