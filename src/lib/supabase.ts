import { createClient } from '@supabase/supabase-js';

// Helper to validate if a string is a valid URL
const isValidUrl = (url: any): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const getEnvVar = (key: string): string | undefined => {
  const value = import.meta.env[key] || (typeof process !== 'undefined' ? process.env[key] : undefined);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return undefined;
  return trimmed;
};

const rawUrl = getEnvVar('VITE_SUPABASE_URL');
const rawKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Extra check for invalid "sb_publishable_" style strings that are not URLs
const isActuallyUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
};

// Use a placeholder if the URL is missing or invalid to prevent crash on load
const supabaseUrl = isActuallyUrl(rawUrl) && isValidUrl(rawUrl) ? rawUrl! : 'https://placeholder-project.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-key';

console.log("Supabase Client Initialization Details:", {
  supabaseUrl,
  hasKey: !!rawKey,
  isPlaceholder: supabaseUrl.includes('placeholder'),
  rawUrlValue: rawUrl ? (isActuallyUrl(rawUrl) ? `${rawUrl.substring(0, 10)}...` : 'INVALID_FORMAT') : 'none',
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = isActuallyUrl(rawUrl) && isValidUrl(rawUrl) && !!rawKey && !rawKey.includes('placeholder');

if (!isSupabaseConfigured) {
  console.warn("Supabase is not fully configured. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.");
}
