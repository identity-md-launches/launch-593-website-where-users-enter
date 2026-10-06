import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import type { Project } from '../src/lib/submissions';

const mocks = vi.hoisted(() => ({ configured: false, fetch: vi.fn(), submit: vi.fn() }));
vi.mock('../src/config', () => ({ get hasBackend() { return mocks.configured; }, backendConfig: { url: '', anonKey: '' } }));
vi.mock('../src/lib/submissions', () => ({ fetchProjects: mocks.fetch, submitProject: mocks.submit }));
const projects: Project[] = [
  { id: '1', projectUsername: 'zebra_tools', twitterUsername: 'builder_one', description: 'Tools for an open community of builders.', contract: `0x${'ab'.repeat(20)}`, wallet: `0x${'cd'.repeat(20)}`, createdAt: '2026-10-06T12:00:00Z' },
  { id: '2', projectUsername: 'alpha_project', twitterUsername: 'builder_two', description: 'A place for independent project research.', contract: `0x${'ef'.repeat(20)}`, wallet: `0x${'ab'.repeat(20)}`, createdAt: '2026-10-05T12:00:00Z' },
];

beforeEach(() => { vi.clearAllMocks(); mocks.configured = false; mocks.fetch.mockReset().mockResolvedValue(projects); });
function cardNames() { return screen.getAllByRole('article').map(card => within(card).getByRole('heading', { level: 3 }).textContent); }
async function renderDirectory() { mocks.configured = true; render(<App />); await screen.findByRole('button', { name: 'zebra_tools' }); }

describe('public project directory', () => {
  it('shows an honest empty directory with only All projects and no sign-in or examples', () => {
    render(<App />);
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'Be the first in the pond.' })).toBeVisible();
    const views = within(screen.getByRole('group', { name: 'Project views' }));
    expect(views.getAllByRole('button')).toHaveLength(1);
    expect(views.getByRole('button', { name: /All projects/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: /sign in|twitter|AI agents|Developer tools|Community/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Preview directory|Example|Privy/i)).not.toBeInTheDocument();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('searches actual records by username, builder and full contract address', async () => {
    const user = userEvent.setup(); await renderDirectory();
    const search = screen.getByRole('searchbox', { name: 'Search projects' });
    for (const term of ['ZEBRA_TOOLS', 'builder_one', projects[0].contract]) {
      await user.clear(search); await user.type(search, term);
      expect(cardNames()).toEqual(['zebra_tools']);
    }
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(cardNames()).toHaveLength(2);
  });

  it('sorts records and uses All projects to reset an empty search', async () => {
    const user = userEvent.setup(); await renderDirectory();
    await user.selectOptions(screen.getByRole('combobox'), 'alphabetical');
    expect(cardNames()).toEqual(['alpha_project', 'zebra_tools']);
    await user.selectOptions(screen.getByRole('combobox'), 'newest');
    expect(cardNames()).toEqual(['zebra_tools', 'alpha_project']);
    await user.type(screen.getByRole('searchbox'), 'missing');
    expect(screen.getByRole('heading', { name: 'No matching projects.' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /All projects/ }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(cardNames()).toHaveLength(2);
  });

  it('opens full details, copies an address and returns focus on close', async () => {
    const user = userEvent.setup(); await renderDirectory();
    const trigger = screen.getByRole('button', { name: 'zebra_tools' }); await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'zebra_tools' });
    expect(within(dialog).getByText(projects[0].contract)).toBeVisible();
    expect(within(dialog).getByText(projects[0].wallet)).toBeVisible();
    expect(within(dialog).getByRole('link', { name: /@builder_one/ })).toHaveAttribute('href', 'https://x.com/builder_one');
    expect(within(dialog).getByText(/are not verified/)).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Copy contract address' }));
    expect(await navigator.clipboard.readText()).toBe(projects[0].contract);
    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' })); expect(trigger).toHaveFocus();
  });

  it('retries a failed directory request without showing fictional fallback data', async () => {
    mocks.configured = true; mocks.fetch.mockRejectedValueOnce(new Error('Check your connection and try again.'));
    const user = userEvent.setup(); render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection');
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('button', { name: 'zebra_tools' }); expect(cardNames()).toHaveLength(2);
  });

  it('returns focus to the persistent menu toggle after closing mobile information', async () => {
    const user = userEvent.setup(); render(<App />);
    const toggle = screen.getByRole('button', { name: 'Open navigation' }); await user.click(toggle);
    await user.click(within(screen.getByRole('navigation', { name: 'Mobile navigation' })).getByRole('button', { name: 'The collective' }));
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close dialog' })); expect(toggle).toHaveFocus();
  });

  it('opens all five editable fields directly from the submit action', async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getAllByRole('button', { name: 'Submit your project' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Share your project' });
    expect(within(dialog).getAllByRole('textbox')).toHaveLength(5);
    expect(within(dialog).getByRole('textbox', { name: /^Twitter account/ })).not.toHaveAttribute('readonly');
    expect(within(dialog).queryByRole('button', { name: /Twitter/ })).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Publishing is not available yet/)).toBeVisible();
  });
});
