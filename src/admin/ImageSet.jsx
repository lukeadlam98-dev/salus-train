import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { A } from './theme'
import * as api from './api'
import { ImagePicker } from './widgets'
import { Ico, I } from '../components/ui'

// A set of photos behind the countdown, not one.
//
// One image is the same image every morning for eight weeks, which
// stops being a photograph and becomes furniture. A dozen or so and
// the card is worth looking at again.
//
// They rotate by day rather than at random on every render — a picture
// that changes while somebody is reading is a distraction, and a
// member should be able to say "that shot of the sled" and have
// everyone else know which one.
export default function ImageSet({ programmeId }) {
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)

  const load = () => api.listProgrammeImages(programmeId).then(setRows)
  useEffect(() => { if (programmeId) load() }, [programmeId])

  const add = async url => {
    if (!url) return
    setBusy(true)
    try { await api.addProgrammeImage(programmeId, url, rows.length + 1); await load() }
    catch (_) {}
    setBusy(false)
  }

  // Which one is showing today, worked out the same way the database
  // does — so the back office and the member's phone agree.
  const todayIdx = rows.length
    ? Math.floor((Date.now() - Date.UTC(2000, 0, 1)) / 86400000) % rows.length
    : -1

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: A.mute,
          letterSpacing: '.06em' }}>RACE PHOTOS</div>
        <div style={{ fontSize: 11.5, color: A.mute }}>
          {rows.length === 0 ? 'none yet'
            : rows.length === 1 ? '1 — add more and they rotate'
            : `${rows.length}, one a day`}
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: C.sub, lineHeight: 1.5,
        margin: '6px 0 12px', maxWidth: 460 }}>
        Sits behind the countdown. Wide and dark works best — the bottom
        two thirds are covered by a scrim with the number over it, so put
        anything worth seeing in the top third.
      </div>

      <div style={{ display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
        gap: 9 }}>
        {rows.map((r, i) => (
          <div key={r.id} style={{ position: 'relative', aspectRatio: '16/9',
            borderRadius: 10, overflow: 'hidden',
            background: `#161514 url(${r.url}) center/cover`,
            border: `1px solid ${i === todayIdx ? C.ink : C.line}` }}>
            {i === todayIdx && (
              <div style={{ position: 'absolute', top: 6, left: 6,
                background: C.ink, color: C.card, borderRadius: 5,
                padding: '3px 7px', fontSize: 9, fontWeight: 800,
                letterSpacing: '.06em' }}>TODAY</div>
            )}
            <button onClick={() => api.removeProgrammeImage(r.id).then(load)}
              style={{ position: 'absolute', top: 6, right: 6, width: 22,
                height: 22, borderRadius: 999, border: 'none',
                background: 'rgba(9,9,8,.7)', cursor: 'pointer',
                display: 'grid', placeItems: 'center' }}>
              <Ico d={I.close} s={11} c="#F6F3EE" w={2.4} />
            </button>
          </div>
        ))}

        <div style={{ aspectRatio: '16/9', opacity: busy ? .5 : 1 }}>
          <ImagePicker value={null} onChange={add} wide />
        </div>
      </div>

      {rows.length > 0 && rows.length < 5 && (
        <div style={{ fontSize: 11.5, color: A.mute, marginTop: 11 }}>
          {rows.length} photo{rows.length === 1 ? '' : 's'} means the same one
          comes round every {rows.length} day{rows.length === 1 ? '' : 's'}.
          A dozen or more and nobody notices the repeat.
        </div>
      )}
    </div>
  )
}
