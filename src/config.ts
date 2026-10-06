export interface SiteConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  relayUrls?: string[];
  directoryTag?: string;
}

declare global { interface Window { PEPE_CONFIG?: Partial<SiteConfig> } }

export const siteConfig: SiteConfig = {
  supabaseUrl: '', supabaseAnonKey: '',
  ...window.PEPE_CONFIG,
};
export const backendConfig = { url: siteConfig.supabaseUrl, anonKey: siteConfig.supabaseAnonKey, relayUrls: siteConfig.relayUrls, directoryTag: siteConfig.directoryTag };
export const usesPublicNetwork = !backendConfig.url && !backendConfig.anonKey;
