import { createClient } from '@supabase/supabase-js'

// Session handling is spelled out rather than left to defaults.
//
// persistSession       keep it in localStorage, so closing the tab or
//                      the app doesn't sign you out
// autoRefreshToken     renew it in the background before it expires,
//                      so a member never gets kicked mid-session
// detectSessionInUrl   read the token out of the magic-link URL
//
// With these on, a member logs in once per device and stays logged in
// for as long as they keep opening the app.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'salus-train-auth',
      flowType: 'pkce',
    },
  }
)
