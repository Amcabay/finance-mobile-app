import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Define a dummy storage for server-side rendering
const SSR_STORAGE = {
  setItem: (_key: string, value: string) => {
    // Do nothing
  },
  getItem: (_key: string) => {
    return null;
  },
  removeItem: (_key: string) => {
    // Do nothing
  },
};


const supabaseUrl = 'https://xbdnxbljfdcxctkkggsk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiZG54YmxqZmRjeGN0a2tnZ3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTM2ODAsImV4cCI6MjA5Mzg4OTY4MH0.w9tAinRuS6OluTphb7z4gmCE0N6ME7FKPD2zNlAEsvE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage on the client, and the dummy storage on the server
    storage: typeof window !== 'undefined' ? AsyncStorage : SSR_STORAGE,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
