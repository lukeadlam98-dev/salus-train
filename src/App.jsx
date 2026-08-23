import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session) return (
    <div style={{ padding: 40, fontFamily: 'system-ui' }}>
      <h1>Salus Train</h1>
      <p>Signed in as {session.user.email}</p>
      <button onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  )

  return (
    <div style={{ padding: 40, fontFamily: 'system-ui' }}>
      <h1>Salus Train</h1>
      {sent ? <p>Check your email for the link.</p> : (
        <>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{ padding: 10, width: 260 }}
          />
          <button
            onClick={async () => {
              await supabase.auth.signInWithOtp({ email })
              setSent(true)
            }}
            style={{ padding: 10, marginLeft: 8 }}
          >
            Send link
          </button>
        </>
      )}
    </div>
  )
}