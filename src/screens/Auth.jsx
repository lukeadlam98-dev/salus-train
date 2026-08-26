import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { P, F } from '../lib/theme'
import { pickMedia } from '../lib/photos'
import { Mark, Ico, I } from '../components/ui'
import Video from '../components/Video'

// Four things on screen: the mark, the line, two fields, one button.
// Everything else — sign up, reset, magic link — is behind one quiet
// link, because on any given morning none of it is what you came for.
export default function Auth({ cfg = {} }) {
  const [step, setStep] = useState('login')   // login | help | signup | sent | reset
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  const addr = () => email.trim().toLowerCase()
  const ok = email.trim().length > 4 && pw.length >= 6

  async function login() {
    setBusy(true); setErr(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: addr(), password: pw,
    })
    setBusy(false)
    if (!error) return
    const m = (error.message || '').toLowerCase()
    setErr(m.includes('invalid') ? 'That doesn\u2019t match.' : error.message)
  }

  async function signup() {
    setBusy(true); setErr(null)
    const { data, error } = await supabase.auth.signUp({
      email: addr(), password: pw,
    })
    setBusy(false)
    if (error) {
      const m = (error.message || '').toLowerCase()
      setErr(m.includes('already') ? 'You already have an account.' : error.message)
      return
    }
    if (!data.session) setStep('sent')
  }

  async function magic() {
    if (email.trim().length < 5) return setErr('Enter your email first.')
    setBusy(true); setErr(null)
    const { error } = await supabase.auth.signInWithOtp({ email: addr() })
    setBusy(false)
    if (error) setErr(error.message); else setStep('sent')
  }

  async function forgot() {
    if (email.trim().length < 5) return setErr('Enter your email first.')
    setBusy(true); setErr(null)
    const { error } = await supabase.auth.resetPasswordForEmail(addr(),
      { redirectTo: window.location.origin })
    setBusy(false)
    if (error) setErr(error.message); else setStep('reset')
  }

  // Real glass has three parts: what shows through it, a bright top
  // edge where light catches, and a soft shadow beneath. One flat
  // translucent panel reads as plastic; these three read as glass.
  const glass = {
    background: 'linear-gradient(160deg,rgba(255,255,255,.22),rgba(255,255,255,.08))',
    backdropFilter: 'blur(34px) saturate(190%) brightness(1.08)',
    WebkitBackdropFilter: 'blur(34px) saturate(190%) brightness(1.08)',
    border: '1px solid rgba(255,255,255,.22)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35),' +
               'inset 0 -1px 0 rgba(255,255,255,.06),' +
               '0 8px 32px rgba(0,0,0,.28)',
  }
  const field = {
    ...glass, width: '100%', color: P.ink, borderRadius: 14,
    padding: '14px 17px', fontSize: 15, outline: 'none', fontFamily: F,
    letterSpacing: '-.01em',
    background: 'linear-gradient(160deg,rgba(255,255,255,.16),rgba(255,255,255,.06))',
  }
  const solid = {
    width: '100%', border: 'none', borderRadius: 14, padding: '14px 0',
    fontSize: 15, fontWeight: 600, fontFamily: F, cursor: 'pointer',
    background: 'linear-gradient(180deg,#FFFCF7,#EFE9DF)',
    color: '#0B0A09', letterSpacing: '-.01em',
    boxShadow: '0 6px 22px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.9)',
    transition: 'opacity .2s',
  }
  const quiet = {
    background: 'transparent', border: 'none', color: 'rgba(246,242,236,.55)',
    fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: F,
    padding: '14px 0 0', width: '100%', textAlign: 'center',
  }
  const opt = {
    ...glass, width: '100%', borderRadius: 14, padding: '15px 17px',
    fontSize: 14.5, fontWeight: 500, fontFamily: F, cursor: 'pointer',
    color: P.ink, textAlign: 'left', marginBottom: 8,
  }
  const wrap = {
    height: '100%', display: 'flex', flexDirection: 'column',
    padding: '54px 24px calc(38px + env(safe-area-inset-bottom))',
    maxWidth: 400, margin: '0 auto',
  }

  return (
    <Video src={pickMedia(cfg, 'splash_video')}
      poster={pickMedia(cfg, 'splash_poster')} dim={.88}
      style={{ height: '100dvh' }}>
      <div style={wrap}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Mark s={24} onPhoto src={pickMedia(cfg, 'logo_url')} />
        </div>

        <div style={{ flex: 1 }} />

        {/* ---- the only screen most people ever see ---- */}
        {step === 'login' && (
          <div style={{ animation: 'up .4s ease' }}>
            <h1 style={{ fontSize: 27, fontWeight: 600, letterSpacing: '-.035em',
              lineHeight: 1.2, margin: '0 0 24px' }}>
              {cfg.login_headline || 'Train with intent.'}
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email" autoCapitalize="none" autoCorrect="off"
                inputMode="email" type="email" autoComplete="email" style={field} />
              <input value={pw} onChange={e => setPw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && ok && login()}
                placeholder="Password" type="password"
                autoComplete="current-password" style={field} />
              <button disabled={busy || !ok} onClick={login}
                style={{ ...solid, marginTop: 4, opacity: busy || !ok ? .38 : 1 }}>
                {busy ? '\u2026' : 'Log in'}
              </button>
            </div>

            {err && (
              <p style={{ fontSize: 12.5, color: '#FFB3A3', marginTop: 12,
                marginBottom: 0, textAlign: 'center' }}>{err}</p>
            )}

            <button onClick={() => { setStep('help'); setErr(null) }}
              style={quiet}>Trouble logging in?</button>
          </div>
        )}

        {/* ---- everything else, one tap away ---- */}
        {step === 'help' && (
          <div style={{ animation: 'up .3s ease' }}>
            <h1 style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-.03em',
              margin: '0 0 18px' }}>What do you need?</h1>
            <button style={opt} onClick={forgot}>
              Reset my password
              <span style={{ display: 'block', fontSize: 12.5,
                color: 'rgba(246,242,236,.55)', marginTop: 3 }}>
                We'll email you a link to set a new one
              </span>
            </button>
            <button style={opt} onClick={magic}>
              Send me a login link
              <span style={{ display: 'block', fontSize: 12.5,
                color: 'rgba(246,242,236,.55)', marginTop: 3 }}>
                Get in without a password, just this once
              </span>
            </button>
            <button style={opt} onClick={() => { setStep('signup'); setErr(null) }}>
              I'm new here
              <span style={{ display: 'block', fontSize: 12.5,
                color: 'rgba(246,242,236,.55)', marginTop: 3 }}>
                Set up an account with your Salus email
              </span>
            </button>
            {err && (
              <p style={{ fontSize: 12.5, color: '#FFB3A3', marginTop: 10,
                textAlign: 'center' }}>{err}</p>
            )}
            <button onClick={() => { setStep('login'); setErr(null) }}
              style={quiet}>Back</button>
          </div>
        )}

        {step === 'signup' && (
          <div style={{ animation: 'up .3s ease' }}>
            <h1 style={{ fontSize: 25, fontWeight: 600, letterSpacing: '-.03em',
              lineHeight: 1.2, margin: '0 0 8px' }}>Create your account</h1>
            <p style={{ fontSize: 13.5, color: 'rgba(246,242,236,.6)',
              margin: '0 0 22px' }}>
              Use the email Salus has for you. Six characters or more.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email" autoCapitalize="none" autoCorrect="off"
                inputMode="email" type="email" autoComplete="email" style={field} />
              <input value={pw} onChange={e => setPw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && ok && signup()}
                placeholder="Choose a password" type="password"
                autoComplete="new-password" style={field} />
              <button disabled={busy || !ok} onClick={signup}
                style={{ ...solid, marginTop: 4, opacity: busy || !ok ? .38 : 1 }}>
                {busy ? '\u2026' : 'Create account'}
              </button>
            </div>
            {err && (
              <p style={{ fontSize: 12.5, color: '#FFB3A3', marginTop: 12,
                textAlign: 'center' }}>{err}</p>
            )}
            <button onClick={() => { setStep('login'); setErr(null); setPw('') }}
              style={quiet}>Back to log in</button>
          </div>
        )}

        {(step === 'sent' || step === 'reset') && (
          <div style={{ animation: 'up .3s ease' }}>
            <div style={{ ...glass, width: 38, height: 38, borderRadius: 999,
              display: 'grid', placeItems: 'center', marginBottom: 16 }}>
              <Ico d={I.check} s={17} c={P.ink} w={2.4} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.03em',
              margin: 0 }}>Check your email</h1>
            <p style={{ fontSize: 14, color: 'rgba(246,242,236,.62)',
              margin: '9px 0 0', lineHeight: 1.55 }}>
              Sent to <b style={{ color: P.ink, fontWeight: 600 }}>{addr()}</b>.
              {step === 'reset' ? ' Tap the link to set a new password.'
                               : ' Tap the link and you\u2019re in.'}
            </p>
            <button onClick={() => { setStep('login'); setErr(null); setPw('') }}
              style={quiet}>Back to log in</button>
          </div>
        )}
      </div>
    </Video>
  )
}
