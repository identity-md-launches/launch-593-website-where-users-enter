import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { exampleProjects } from '../src/lib/projects';

const mocks = vi.hoisted(() => ({
  auth: {
    ready: true, authenticated: false, twitterUsername: null as string | null, error: null,
    login: vi.fn(), logout: vi.fn(), getAccessToken: vi.fn(),
  },
}));
vi.mock('../src/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('../src/config', () => ({ hasBackend: false, backendConfig: { url: '', anonKey: '' } }));
vi.mock('../src/lib/submissions', () => ({ fetchProjects: vi.fn(), submitProject: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.authenticated = false;
  mocks.auth.twitterUsername = null;
});

function cardNames() {
  return screen.getAllByRole('article').map((card) => within(card).getByRole('heading', { level: 3 }).textContent);
}

describe('public project directory', () => {
  it('lets signed-out visitors search project usernames, builders and full contract addresses', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getAllByRole('article')).toHaveLength(6);
    const search = screen.getByRole('searchbox', { name: 'Search projects' });
    await user.type(search, 'SWARM_PROTOCOL');
    expect(cardNames()).toEqual(['Swarm Protocol']);
    await user.clear(search);
    await user.type(search, 'frogstack_dev');
    expect(cardNames()).toEqual(['FrogStack']);
    await user.clear(search);
    await user.type(search, exampleProjects[3].contract);
    expect(cardNames()).toEqual(['LilyPad']);
    expect(mocks.auth.login).not.toHaveBeenCalled();
  });

  it('filters categories and clears both search and category from an empty state', async () => {
    const user = userEvent.setup();
    render(<App />);
    const category = screen.getByRole('button', { name: 'Developer tools' });
    await user.click(category);
    expect(category).toHaveAttribute('aria-pressed', 'true');
    expect(cardNames()).toEqual(['FrogStack', 'Prompt Pond']);
    await user.type(screen.getByRole('searchbox'), 'no-such-project');
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'No frogs in this corner yet.' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.getByRole('button', { name: /All projects/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('article')).toHaveLength(6);
  });

  it('changes sort order and lets the clear-search control restore matching category results', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by:' }), 'alphabetical');
    expect(cardNames()).toEqual(['FrogStack', 'LilyPad', 'Pepe Research', 'Pond AI', 'Prompt Pond', 'Swarm Protocol']);
    await user.selectOptions(screen.getByRole('combobox'), 'newest');
    expect(cardNames()[0]).toBe('Pond AI');
    await user.click(screen.getByRole('button', { name: 'AI agents' }));
    await user.type(screen.getByRole('searchbox'), 'Swarm');
    expect(cardNames()).toEqual(['Swarm Protocol']);
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(cardNames()).toEqual(['Pond AI', 'Swarm Protocol']);
  });

  it('opens complete public project details, copies an address and restores focus on close', async () => {
    const user = userEvent.setup();
    render(<App />);
    const trigger = screen.getByRole('button', { name: 'Pond AI' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Pond AI' });
    expect(within(dialog).getByText(exampleProjects[0].contract)).toBeVisible();
    expect(within(dialog).getByText(exampleProjects[0].wallet)).toBeVisible();
    expect(within(dialog).getByText('@pond_builder')).toBeVisible();
    expect(within(dialog).getByText(exampleProjects[0].description)).toBeVisible();
    expect(within(dialog).getByText(/not a real submission/)).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Copy contract address' }));
    expect(await navigator.clipboard.readText()).toBe(exampleProjects[0].contract);
    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('opens the Twitter gate from the primary submit action without exposing editable fields', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Submit your project' }));
    const dialog = screen.getByRole('dialog', { name: 'Join the collective' });
    expect(within(dialog).getByRole('button', { name: 'Continue with Twitter' })).toBeVisible();
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Continue with Twitter' }));
    expect(mocks.auth.login).toHaveBeenCalledOnce();
  });
});
