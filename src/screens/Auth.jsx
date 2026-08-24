import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { P, F } from '../lib/theme'
import { PHOTOS, VIDEO } from '../lib/photos'
import { Mark, Ico, I } from '../components/ui'
import Video from '../components/Video'

// Email and password, like every other training app. The password is
// what makes it instant — there's no inbox round trip because the
// password is the proof. Magic link stays as the way back in for
// anyone who's forgotten theirs.
export default function Auth() {
  const [step, setStep] = useState('login')   // login | signup | sent | reset
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
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
    if (m.includes('invalid')) setErr("That email and password don\u2019t match.")
    else if (m.includes('confirm')) setErr('Check your email to confirm your account first.')
    else setErr(error.message)
  }

  async function signup() {
    setBusy(true); setErr(null)
    const { data, error } = await supabase.auth.signUp({
      email: addr(), password: pw,
    })
    setBusy(false)
    if (error) {
      const m = (error.message || '').toLowerCase()
      setErr(m.includes('already')
        ? 'You already have an account \u2014 log in instead.'
        : error.message)
      return
    }
    if (!data.session) setStep('sent')   // only if confirmation is switched on
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

  const white = {
    width: '100%', border: 'none', borderRadius: 999, padding: '18px 0',
    fontSize: 16.5, fontWeight: 700, fontFamily: F, cursor: 'pointer',
    background: P.ink, color: '#0B0A09',
  }
  const ghost = { ...white, background: 'rgba(255,255,255,.14)', color: P.ink }
  const field = {
    width: '100%', background: 'rgba(255,255,255,.1)', color: P.ink,
    border: '1.5px solid rgba(255,255,255,.22)', borderRadius: 999,
    padding: '17px 20px', fontSize: 16, outline: 'none', fontFamily: F,
  }
  const quiet = {
    background: 'transparent', border: 'none', color: P.sub, fontSize: 14,
    fontWeight: 600, cursor: 'pointer', fontFamily: F, padding: 0,
  }
  const signing = step === 'signup'

  return (
    <Video src={VIDEO.splash} poster={PHOTOS.hero} dim={1.15}
      style={{ height: '100dvh' }}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
        padding: '54px 20px calc(30px + env(safe-area-inset-bottom))',
        maxWidth: 520, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Mark s={32} onPhoto />
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 800,
          letterSpacing: '.34em', marginTop: 11 }}>SALUS TRAIN</div>

        <div style={{ flex: 1 }} />

        {(step === 'login' || step === 'signup') && (
          <div style={{ animation: 'up .4s ease' }}>
            <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-.04em',
              lineHeight: 1.08, margin: 0 }}>
              {signing ? <>Create your<br />account.</>
                       : <>Every session.<br />Every number.<br />One place.</>}
            </h1>

            <div style={{ marginTop: 22 }}>
              <input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email" autoCapitalize="none" autoCorrect="off"
                inputMode="email" type="email" autoComplete="email" style={field} />

              <div style={{ position: 'relative', marginTop: 10 }}>
                <input value={pw} onChange={e => setPw(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && ok && (signing ? signup() : login())}
                  placeholder="Password" type={show ? 'text' : 'password'}
                  autoComplete={signing ? 'new-password' : 'current-password'}
                  style={{ ...field, paddingRight: 70 }} />
                <button onClick={() => setShow(!show)}
                  style={{ ...quiet, position: 'absolute', right: 20, top: 16,
                    fontSize: 12.5, fontWeight: 700 }}>
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>

              <button disabled={busy || !ok} onClick={signing ? signup : login}
                style={{ ...white, marginTop: 12, opacity: busy || !ok ? .45 : 1 }}>
                {busy ? 'One moment\u2026' : signing ? 'Create account' : 'Log in'}
              </button>

              {err && (
                <p style={{ fontSize: 13.5, color: '#FFB3A3', marginTop: 13,
                  marginBottom: 0, lineHeight: 1.5, textAlign: 'center' }}>{err}</p>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 18,
                marginTop: 18 }}>
                {signing ? (
                  <button onClick={() => { setStep('login'); setErr(null) }}
                    style={quiet}>Already a member? Log in</button>
                ) : (
                  <>
                    <button onClick={forgot} style={quiet}>Forgot password</button>
                    <span style={{ color: P.sub, opacity: .4 }}>·</span>
                    <button onClick={magic} style={quiet}>Email me a link</button>
                  </>
                )}
              </div>
            </div>

            {!signing && (
              <button onClick={() => { setStep('signup'); setErr(null) }}
                style={{ ...ghost, marginTop: 22 }}>Create an account</button>
            )}
          </div>
        )}

        {(step === 'sent' || step === 'reset') && (
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
              {step === 'reset'
                ? <>We\u2019ve sent a reset link to <b style={{ color: P.ink }}>{addr()}</b>. Tap it and you can set a new password.</>
                : <>We\u2019ve sent a link to <b style={{ color: P.ink }}>{addr()}</b>. Tap it and you\u2019re in.</>}
            </p>
            <button style={{ ...ghost, marginTop: 24 }}
              onClick={() => { setStep('login'); setErr(null); setPw('') }}>
              Back to log in
            </button>
          </div>
        )}
      </div>
    </Video>
  )
}
