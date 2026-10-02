export interface SiteConfig {
  privyAppId: string;
  privyClientId?: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

declare global { interface Window { PEPE_CONFIG?: Partial<SiteConfig> } }

export const siteConfig: SiteConfig = {
  privyAppId: '', privyClientId: '', supabaseUrl: '', supabaseAnonKey: '',
  ...window.PEPE_CONFIG,
};
export const backendConfig = { url: siteConfig.supabaseUrl, anonKey: siteConfig.supabaseAnonKey };
export const hasBackend = Boolean(backendConfig.url && backendConfig.anonKey);
