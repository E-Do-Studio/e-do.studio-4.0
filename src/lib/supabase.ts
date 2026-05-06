import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

let _client: ReturnType<typeof createClient<Database>> | null = null;

export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    if (!_client) {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY environment variables');
      }
      _client = createClient<Database>(supabaseUrl, supabaseKey);
    }
    return (_client as any)[prop];
  },
});
