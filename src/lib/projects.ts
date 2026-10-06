import type { Project, ProjectInput } from './submissions';

export function filterProjects(projects: Project[], query: string, sort: string) {
  const search = query.trim().toLowerCase();
  return projects.filter(project =>
    [project.projectUsername, project.twitterUsername, project.description, project.contract]
      .some(value => value.toLowerCase().includes(search)))
    .sort((a, b) => sort === 'alphabetical'
      ? a.projectUsername.localeCompare(b.projectUsername)
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function validateProject(input: ProjectInput): Partial<Record<keyof ProjectInput, string>> {
  const errors: Partial<Record<keyof ProjectInput, string>> = {};
  if (input.twitterUsername.trim() && !/^[a-zA-Z0-9_]{1,15}$/.test(input.twitterUsername.trim().replace(/^@/, ''))) errors.twitterUsername = 'Use a Twitter username with 1–15 letters, numbers, or underscores.';
  if (!/^[a-zA-Z0-9_]{1,15}$/.test(input.projectUsername.trim().replace(/^@/, ''))) errors.projectUsername = 'Enter your project’s Twitter username: 1–15 letters, numbers, or underscores.';
  if (!/^0x[0-9a-fA-F]{40}$/.test(input.contract.trim()) || /^0x0{40}$/i.test(input.contract.trim())) {
    errors.contract = 'Enter a nonzero EVM contract address: 0x followed by 40 hexadecimal characters.';
  }
  if (input.description.trim().length < 20 || input.description.trim().length > 1000) errors.description = 'Tell us about your project in 20–1,000 characters.';
  return errors;
}
