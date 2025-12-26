
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../utils/env';

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_ANON_KEY');

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true, // Critical for OAuth redirect handling
      flowType: 'pkce', // Use PKCE flow for better security
    }
  })
  : null;

export const isSupabaseConfigured = () => !!supabase;

