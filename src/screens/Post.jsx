import { useState, useRef } from 'react'
import { C, T, F } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { addPost } from '../lib/data'
import { Btn, Ico, I, Avatar } from '../components/ui'

// Say something about the session you just did.
//
// Deliberately optional and deliberately after the fact — the app
// never asks mid-workout. Most people will skip it, and the ones who
// don't are the reason a small club feed works at all.
export default function Post({ userId, profile, workout, run, onClose, onPosted }) {
  const [body, setBody] = useState('')
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const input = useRef(null)

  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      return setErr(`That's ${(file.size / 1048576).toFixed(1)}MB. Under 8 please.`)
    }
    setBusy(true); setErr(null)
    try {
      const name = `posts/${userId}-${Date.now()}.jpg`
      const { error } = await supabase.storage.from('Photos')
        .upload(name, file, { cacheControl: '3600' })
      if (error) throw error
      setPhoto(supabase.storage.from('Photos').getPublicUrl(name).data.publicUrl)
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }

  async function post() {
    setBusy(true); setErr(null)
    try {
      await addPost(userId, {
        workout_id: workout?.id || null,
        run_id: run?.id || null,
        body: body.trim() || null,
        photo_url: photo,
      })
      onPosted?.()
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <>
      <div onClick={() => !busy && onClose()} style={{ position: 'fixed',
        inset: 0, background: 'rgba(0,0,0,.66)', zIndex: 80,
        animation: 'fade .2s ease' }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 90,
        background: C.sheet, borderRadius: '22px 22px 0 0',
        padding: '12px 18px calc(22px + env(safe-area-inset-bottom))',
        animation: 'sheet .27s cubic-bezier(.2,.85,.25,1)' }}>

        <div style={{ width: 38, height: 4.5, background: C.card3,
          borderRadius: 999, margin: '0 auto 18px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 11,
          marginBottom: 14 }}>
          <Avatar name={profile?.name || 'You'} size={34} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {profile?.name || 'You'}
            </div>
            <div style={{ fontSize: 12, color: C.mute, marginTop: 1 }}>
              Everyone on the board will see this
            </div>
          </div>
        </div>

        <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
          autoFocus
          placeholder="How did it go? Legs, weather, whether the sled moved…"
          style={{ width: '100%', background: C.card2, color: C.ink,
            border: `1px solid ${C.line}`, borderRadius: 13, padding: '14px 15px',
            fontSize: 15, outline: 'none', fontFamily: F, lineHeight: 1.5,
            resize: 'none' }} />

        {photo && (
          <div style={{ position: 'relative', marginTop: 11 }}>
            <div style={{ height: 172, borderRadius: 13,
              background: `#0A0A09 url(${photo}) center/cover` }} />
            <button onClick={() => setPhoto(null)} style={{ position: 'absolute',
              top: 9, right: 9, width: 28, height: 28, borderRadius: 999,
              background: 'rgba(10,10,9,.72)', border: 'none', cursor: 'pointer',
              display: 'grid', placeItems: 'center' }}>
              <Ico d={I.close} s={13} c={C.ink} w={2.2} />
            </button>
          </div>
        )}

        {err && (
          <p style={{ fontSize: 12.5, color: C.red, marginTop: 11 }}>{err}</p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          marginTop: 14 }}>
          {!photo && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8,
              background: C.card2, border: `1px solid ${C.line}`,
              borderRadius: 999, padding: '11px 16px', fontSize: 13.5,
              fontWeight: 600, cursor: 'pointer', color: C.ink }}>
              <Ico d={I.camera} s={15} c={C.sub} w={1.9} />
              Add a photo
              <input type="file" accept="image/*" onChange={pick}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
            </label>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: 'transparent',
            border: 'none', color: C.sub, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: F, padding: '11px 8px' }}>Skip</button>
          <button onClick={post} disabled={busy || (!body.trim() && !photo)}
            style={{ border: 'none', borderRadius: 999, padding: '13px 24px',
              fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: F,
              background: C.g, color: C.bg,
              opacity: busy || (!body.trim() && !photo) ? .4 : 1 }}>
            {busy ? '…' : 'Post'}
          </button>
        </div>
      </div>
    </>
  )
}
