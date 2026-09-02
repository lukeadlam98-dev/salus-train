import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { P, F } from '../lib/theme'
import { pickMedia } from '../lib/photos'
import { Mark, Ico, I } from '../components/ui'
import Video from '../components/Video'

// Shown when someone arrives from a reset link. Supabase has already
// signed them in with a recovery session by this point — the only
// thing left is to set the password and get out of the way.
export default function SetPassword({ cfg = {}, onDone }) {
  const [pw, setPw] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const short = pw.length > 0 && pw.length < 6
  const mismatch = again.length > 0 && pw !== again
  const ok = pw.length >= 6 && pw === again

  async function save() {
    setBusy(true); setErr(null)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setErr(error.message)
    onDone?.()
  }

  const glass = {
    background: 'linear-gradient(160deg,rgba(255,255,255,.16),rgba(255,255,255,.06))',
    backdropFilter: 'blur(34px) saturate(190%) brightness(1.08)',
    WebkitBackdropFilter: 'blur(34px) saturate(190%) brightness(1.08)',
    border: '1px solid rgba(255,255,255,.22)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), 0 8px 32px rgba(0,0,0,.28)',
  }
  const field = {
    ...glass, width: '100%', color: P.ink, borderRadius: 14,
    padding: '14px 17px', fontSize: 15, outline: 'none', fontFamily: F,
  }
  const solid = {
    width: '100%', border: 'none', borderRadius: 14, padding: '14px 0',
    fontSize: 15, fontWeight: 600, fontFamily: F, cursor: 'pointer',
    background: 'linear-gradient(180deg,#FFFCF7,#EFE9DF)', color: '#0B0A09',
    boxShadow: '0 6px 22px rgba(0,0,0,.32)', transition: 'opacity .2s',
  }

  return (
    <Video src={pickMedia(cfg, 'splash_video')}
      poster={pickMedia(cfg, 'splash_poster')} dim={.88}
      style={{ height: '100dvh' }}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
        padding: '54px 24px calc(38px + env(safe-area-inset-bottom))',
        maxWidth: 400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Mark s={24} onPhoto src={pickMedia(cfg, 'logo_url')} />
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ animation: 'up .4s ease' }}>
          <h1 style={{ fontSize: 27, fontWeight: 600, letterSpacing: '-.035em',
            lineHeight: 1.2, margin: 0 }}>Set a password.</h1>
          <p style={{ fontSize: 14.5, color: 'rgba(246,242,236,.62)',
            margin: '10px 0 22px', lineHeight: 1.5 }}>
            Six characters or more. After this you're straight in — no more links.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={pw} onChange={e => setPw(e.target.value)}
              placeholder="New password" type="password" autoFocus
              autoComplete="new-password" style={field} />
            <input value={again} onChange={e => setAgain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && ok && save()}
              placeholder="Again" type="password"
              autoComplete="new-password" style={field} />
            <button disabled={busy || !ok} onClick={save}
              style={{ ...solid, marginTop: 4, opacity: busy || !ok ? .38 : 1 }}>
              {busy ? '\u2026' : 'Save and go in'}
            </button>
          </div>

          {(short || mismatch || err) && (
            <p style={{ fontSize: 12.5, color: '#FFB3A3', marginTop: 13,
              marginBottom: 0, textAlign: 'center', lineHeight: 1.5 }}>
              {err || (short ? 'A bit longer than that.' : 'Those don\u2019t match.')}
            </p>
          )}
        </div>
      </div>
    </Video>
  )
}
