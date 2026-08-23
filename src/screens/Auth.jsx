import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { C, P, T, F } from '../lib/theme'
import { PHOTOS, VIDEO } from '../lib/photos'
import { Mark, Ico, I } from '../components/ui'
import Video from '../components/Video'

export default function Auth() {
  const [step, setStep] = useState('splash')   // splash | email | sent
  const [email, setEmail] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  async function send() {
    setBusy(true); setErr(null)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() })
    setBusy(false)
    if (error) setErr(error.message)
    else setStep('sent')
  }

  const white = {
    width: '100%', border: 'none', borderRadius: 999, padding: '18px 0',
    fontSize: 16.5, fontWeight: 700, fontFamily: F, cursor: 'pointer',
    background: P.ink, color: '#0B0A09',
  }
  const ghost = { ...white, background: 'rgba(255,255,255,.14)', color: P.ink }

  return (
    <Video src={VIDEO.splash} poster={PHOTOS.hero} dim={1.15}
      style={{ height: '100dvh' }}>
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        padding: '54px 20px calc(30px + env(safe-area-inset-bottom))',
        maxWidth: 520, margin: '0 auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Mark s={32} onPhoto />
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 800,
          letterSpacing: '.34em', marginTop: 11 }}>SALUS TRAIN</div>

        <div style={{ flex: 1 }} />

        {step === 'splash' && (
          <div style={{ animation: 'up .4s ease' }}>
            <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-.04em',
              lineHeight: 1.05, margin: 0 }}>
              Every session.<br />Every number.<br />One place.
            </h1>
            <p style={{ fontSize: 15.5, color: P.sub, margin: '14px 0 24px',
              lineHeight: 1.5 }}>
              Programmes written by our coaches, built around the kit in our room,
              trained alongside everyone else at Salus.
            </p>
            <button style={white} onClick={() => setStep('email')}>Continue</button>
            <p style={{ fontSize: 12.5, color: P.sub, textAlign: 'center',
              marginTop: 14, marginBottom: 0 }}>
              Members only. Use the email Salus has for you.
            </p>
          </div>
        )}

        {step === 'email' && (
          <div style={{ animation: 'up .3s ease' }}>
            <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-.035em',
              lineHeight: 1.15, margin: 0 }}>What's your email?</h1>
            <p style={{ fontSize: 15, color: P.sub, margin: '10px 0 20px',
              lineHeight: 1.5 }}>
              We'll send a link. No password to remember — new or returning, it's the
              same door.
            </p>

            <input value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && email.trim().length > 4 && send()}
              placeholder="your@email.com" autoFocus autoCapitalize="none"
              autoCorrect="off" inputMode="email" type="email"
              style={{ width: '100%', background: 'rgba(255,255,255,.1)', color: P.ink,
                border: '1.5px solid rgba(255,255,255,.22)', borderRadius: 999,
                padding: '17px 20px', fontSize: 16, outline: 'none',
                textAlign: 'center', fontFamily: F }} />

            <button disabled={busy || email.trim().length < 5} onClick={send}
              style={{ ...white, marginTop: 12,
                opacity: busy || email.trim().length < 5 ? .45 : 1 }}>
              {busy ? 'Sending…' : 'Send me a link'}
            </button>

            {err && <p style={{ fontSize: 13.5, color: '#FFB3A3', textAlign: 'center',
              marginTop: 12, marginBottom: 0, lineHeight: 1.45 }}>{err}</p>}

            <button onClick={() => { setStep('splash'); setErr(null) }}
              style={{ width: '100%', background: 'transparent', border: 'none',
                color: P.sub, fontSize: 14.5, fontWeight: 600, cursor: 'pointer',
                fontFamily: F, padding: '14px 0 0' }}>Back</button>
          </div>
        )}

        {step === 'sent' && (
          <div style={{ animation: 'up .3s ease' }}>
            <div style={{ width: 52, height: 52, borderRadius: 999,
              background: 'rgba(255,255,255,.14)', display: 'grid',
              placeItems: 'center', marginBottom: 18 }}>
              <Ico d={I.check} s={24} c={P.ink} w={2.4} />
            </div>
            <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-.035em',
              lineHeight: 1.2, margin: 0 }}>Check your email</h1>
            <p style={{ fontSize: 15, color: P.sub, margin: '11px 0 0',
              lineHeight: 1.55 }}>
              We've sent a link to <b style={{ color: P.ink }}>{email.trim()}</b>. Tap it
              and you're in. It expires in an hour, and the first one sometimes lands
              in spam.
            </p>
            <button style={{ ...ghost, marginTop: 24 }}
              onClick={() => { setStep('email'); setErr(null) }}>
              Use a different email
            </button>
          </div>
        )}
      </div>
    </Video>
  )
}
