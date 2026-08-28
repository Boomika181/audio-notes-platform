import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Config } from './config';

export const getSupabaseUrl = (): string | undefined => {
  let url = Config.SUPABASE_URL;
  if (!url) return undefined;
  
  url = url.trim();
  if (!url) return undefined;

  // If user provided just the hostname, prepend https://
  if (url.includes('.supabase.co') && !url.startsWith('http')) {
    url = `https://${url}`;
  }
  
  return url;
};

export const isPlaceholderUrl = (url?: string): boolean => {
  if (!url) return false;
  const placeholderIds = [
    'placeholder',
    'your-project-id',
    'xyz.supabase.co'
  ];
  return placeholderIds.some(id => url.includes(id));
};

export const isValidSupabaseUrl = (url?: string): boolean => {
  if (!url) return false;
  if (isPlaceholderUrl(url)) return false;
  try {
    const parsed = new URL(url);
    // Basic format check
    const isSupabaseHost = parsed.hostname.endsWith('.supabase.co') || parsed.hostname.endsWith('.supabase.net');
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && isSupabaseHost;
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const key = Config.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return !!(url && key && isValidSupabaseUrl(url));
};

let cachedClient: SupabaseClient | null = null;
let cachedUrl: string | undefined = undefined;
let cachedKey: string | undefined = undefined;

export const getSupabaseAdmin = (): SupabaseClient => {
  const url = getSupabaseUrl() || 'https://placeholder.supabase.co';
  const key = Config.SUPABASE_SERVICE_ROLE_KEY?.trim() || 'placeholder-key';

  if (!cachedClient || cachedUrl !== url || cachedKey !== key) {
    cachedUrl = url;
    cachedKey = key;
    cachedClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return cachedClient;
};

// Privileged client proxy for server-side operations
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop: keyof SupabaseClient) {
    const client = getSupabaseAdmin();
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

