import type { Project, ProjectInput } from './submissions';

export const categories = ['All projects', 'AI agents', 'Developer tools', 'Community'] as const;
export type Category = typeof categories[number];
export type DisplayProject = Project & { example?: boolean; name?: string; category?: Category; mark?: number };

const samples = [
  { name: 'Pond AI', projectUsername: 'pond_ai', twitterUsername: 'pond_builder', description: 'Your onchain co-pilot. An AI agent that makes sense of the noise so you can focus on what’s next.', category: 'AI agents', mark: 0 },
  { name: 'Swarm Protocol', projectUsername: 'swarm_protocol', twitterUsername: 'swarm_builder', description: 'One agent is smart. A swarm is unstoppable. Open infrastructure for AI agents that work together.', category: 'AI agents', mark: 1 },
  { name: 'FrogStack', projectUsername: 'frogstack', twitterUsername: 'frogstack_dev', description: 'Less boilerplate. More building. A developer toolkit for bringing your next AI idea to life.', category: 'Developer tools', mark: 2 },
  { name: 'LilyPad', projectUsername: 'lilypad', twitterUsername: 'lilypad_builder', description: 'A little space for big ideas. Find collaborators, share experiments, and grow with fellow builders.', category: 'Community', mark: 3 },
  { name: 'Pepe Research', projectUsername: 'pepe_research', twitterUsername: 'pepe_researcher', description: 'An open research community exploring the intersection of AI, onchain intelligence, and internet culture.', category: 'Community', mark: 4 },
  { name: 'Prompt Pond', projectUsername: 'prompt_pond', twitterUsername: 'prompt_builder', description: 'Better prompts, better possibilities. A shared developer library of tools and workflows worth passing on.', category: 'Developer tools', mark: 5 },
] satisfies Partial<DisplayProject>[];

export const exampleProjects: DisplayProject[] = samples.map((project, i) => ({
  ...project, id: `example-${i}`, example: true,
  contract: `0x${String(i + 1).repeat(40)}`, wallet: `0x${String(i + 2).repeat(40)}`,
  createdAt: new Date(Date.UTC(2026, 8, 20 - i)).toISOString(),
}));

export function categoryFor(project: DisplayProject): Category {
  if (project.category) return project.category;
  const text = `${project.projectUsername} ${project.description}`.toLowerCase();
  if (/agent|copilot|co-pilot|autonom/.test(text)) return 'AI agents';
  if (/tool|sdk|developer|infrastructure|api|library/.test(text)) return 'Developer tools';
  return 'Community';
}

export function filterProjects(projects: DisplayProject[], query: string, category: Category, sort: string) {
  const search = query.trim().toLowerCase();
  return projects.filter(project => (category === 'All projects' || categoryFor(project) === category)
    && [project.name, project.projectUsername, project.twitterUsername, project.description, project.contract]
      .some(value => value?.toLowerCase().includes(search)))
    .sort((a, b) => sort === 'alphabetical'
      ? (a.name || a.projectUsername).localeCompare(b.name || b.projectUsername)
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function validateProject(input: ProjectInput): Partial<Record<keyof ProjectInput, string>> {
  const errors: Partial<Record<keyof ProjectInput, string>> = {};
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(input.projectUsername.trim().replace(/^@/, ''))) errors.projectUsername = 'Use 3–32 letters, numbers, underscores, or hyphens.';
  for (const field of ['contract', 'wallet'] as const) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(input[field].trim()) || /^0x0{40}$/i.test(input[field].trim())) {
      errors[field] = `Enter a nonzero EVM ${field === 'contract' ? 'contract' : 'wallet'} address: 0x followed by 40 hexadecimal characters.`;
    }
  }
  if (input.description.trim().length < 20 || input.description.trim().length > 1000) errors.description = 'Tell us about your project in 20–1,000 characters.';
  return errors;
}
