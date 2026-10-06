import { fetchProjects as fetchSupabaseProjects, submitProject as submitSupabaseProject, type BackendConfig, type ProjectInput } from '../lib/submissions';
import { publishPublicProject, readPublicProjects } from './public-directory';

export type { Project, ProjectInput } from '../lib/submissions';
interface DirectoryConfig extends BackendConfig { relayUrls?: string[]; directoryTag?: string }

export function fetchProjects(config: DirectoryConfig) {
  return !config.url && !config.anonKey
    ? readPublicProjects(config.relayUrls, config.directoryTag)
    : fetchSupabaseProjects(config);
}

export function submitProject(config: DirectoryConfig, input: ProjectInput) {
  return !config.url && !config.anonKey
    ? publishPublicProject(input, config.relayUrls, config.directoryTag)
    : submitSupabaseProject(config, input);
}
