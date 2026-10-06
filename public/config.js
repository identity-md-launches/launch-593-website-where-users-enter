// Works without credentials: projects are stored on the public Nostr network.
// Optional Supabase identifiers select the existing managed backend instead.
window.PEPE_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  relayUrls: ['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nostr.mom'],
  directoryTag: 'identitymd-593-projects-v1',
};
