import { createClient } from '@supabase/supabase-js'

// Session handling is spelled out rather than left to defaults.
//
// persistSession       keep it in localStorage, so closing the app
//                      doesn't sign anyone out
// autoRefreshToken     renew it quietly before it expires
// detectSessionInUrl   read the token out of a magic or reset link
//
// flowType is 'implicit' on purpose. PKCE is the stricter option, but
// it stores a verifier in the browser that requested the link and
// requires the link to be opened in that same browser. Members request
// on a laptop and open on a phone constantly, and under PKCE that
// fails silently — you land back on the login screen with no error.
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
      flowType: 'implicit',
    },
  }
)
