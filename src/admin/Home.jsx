import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { A, previewVars } from './theme'
import * as api from './api'
import { Save, Field, Toggle, Btn, ImagePicker, Confirm, Sortable, Grip } from './widgets'
import DeleteProgramme from './DeleteProgramme'

// The members' home, arranged from here rather than from code.
// Left: the sections, in order, with switches. Right: a phone showing
// the result. Drag one and the phone rearranges.
export default function Home() {
  const [sections, setSections] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [cfg, setCfg] = useState({})
  const [tab, setTab] = useState('sections')
  const [err, setErr] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [deleting, setDeleting] = useState(null)

  // Anything that writes goes through here, so a failure says so
  // rather than looking like nothing happened.
  const run = async fn => {
    setErr(null)
    try { await fn() } catch (e) { setErr(e.message || 'That didn\u2019t save.') }
  }

  const loadS = () => api.listSections().then(setSections)
  const loadP = () => api.listProgrammes({ includeArchived: true })
    .then(setProgrammes)
  useEffect(() => { loadS(); loadP(); api.getConfig().then(setCfg) }, [])

  const patchCfg = (k, v) => run(async () => {
    await api.setConfig(k, v)
    setCfg(c => ({ ...c, [k]: v }))
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px',
      gap: 34, alignItems: 'start' }}>

      <div style={{ minWidth: 0 }}>
        <h1 style={T.h1}>The members' home</h1>
        <p style={{ ...T.body, marginTop: 7, maxWidth: 560 }}>
          What they see when they open the app. Drag to reorder, switch off what
          you don't want, and the phone on the right keeps up.
        </p>

        {err && (
          <div style={{ background: C.card, border: `1px solid ${C.line}`,
            borderRadius: 10, padding: '11px 14px', fontSize: 13, color: C.red,
            marginTop: 16, lineHeight: 1.5 }}>{err}</div>
        )}

        <div style={{ display: 'flex', gap: 7, margin: '22px 0 18px' }}>
          {[['sections', 'Sections'], ['programmes', 'Programmes'],
            ['splash', 'Splash'], ['words', 'Words']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ borderRadius: 8, padding: '8px 14px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F,
                background: tab === k ? C.ink : C.card,
                border: `1px solid ${tab === k ? C.ink : C.line}`,
                color: tab === k ? C.bg : C.sub }}>{l}</button>
          ))}
        </div>

        {tab === 'sections' && (
          <Sortable ids={sections.map(s => s.id)}
            onReorder={ids => {
              api.reorderSections(ids)
              setSections(ids.map(id => sections.find(s => s.id === id)))
            }}>
            {sections.map(s => (
              <div key={s.id} style={{ background: C.card, borderRadius: 13,
                border: `1px solid ${C.line}`, boxShadow: C.shadow, padding: 14,
                marginBottom: 9, display: 'flex', alignItems: 'center', gap: 13,
                opacity: s.visible ? 1 : .55 }}>
                <Grip />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 2,
                    lineHeight: 1.45 }}>{s.note}</div>
                  {s.heading != null && (
                    <div style={{ marginTop: 8, maxWidth: 320 }}>
                      <Save value={s.heading} placeholder="Heading above it"
                        onSave={v => api.setSection(s.id, { heading: v })} />
                    </div>
                  )}
                </div>
                <Toggle on={s.visible} label={s.visible ? 'On' : 'Off'}
                  onChange={v => {
                    api.setSection(s.id, { visible: v })
                    setSections(sections.map(x =>
                      x.id === s.id ? { ...x, visible: v } : x))
                  }} />
              </div>
            ))}
          </Sortable>
        )}

        {tab === 'programmes' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ ...T.body, fontSize: 12.5, flex: 1 }}>
                New ones arrive as Coming soon. Switch them Live when the
                first week is published.
              </div>
              <Btn small tone="solid" onClick={() => run(async () => {
                await api.addProgramme()
                await loadP()
              })}>Add programme</Btn>
            </div>
            {programmes.some(p => p.archived) && (
              <div style={{ marginBottom: 12 }}>
                <Toggle on={showArchived} label="Show archived"
                  onChange={setShowArchived} />
              </div>
            )}
            <Sortable ids={programmes.filter(p => showArchived || !p.archived).map(p => p.id)}
              onReorder={ids => {
                api.reorderProgrammes(ids)
                setProgrammes(ids.map(id => programmes.find(p => p.id === id)))
              }}>
              {programmes.filter(p => showArchived || !p.archived).map(p => (
                <div key={p.id} style={{ background: C.card, borderRadius: 13,
                  border: `1px solid ${C.line}`, boxShadow: C.shadow, padding: 14,
                  marginBottom: 9, display: 'flex', gap: 13,
                  opacity: p.archived ? .5 : 1 }}>
                  <div style={{ paddingTop: 20 }}><Grip /></div>
                  <ImagePicker value={p.cover_url}
                    onChange={v => run(async () => {
                      await api.setProgramme(p.id, { cover_url: v })
                      await loadP()
                    })} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'grid',
                      gridTemplateColumns: 'minmax(0,1fr) 74px', gap: 8 }}>
                      <Save value={p.name} onSave={v =>
                        api.setProgramme(p.id, { name: v })} />
                      <Save value={p.weeks ?? ''} placeholder="8"
                        onSave={v => api.setProgramme(p.id,
                          { weeks: Number(v) || null })} />
                    </div>
                    <div style={{ marginTop: 7 }}>
                      <Save value={p.blurb} rows={2}
                        placeholder="One line about it"
                        onSave={v => api.setProgramme(p.id, { blurb: v })} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14,
                      marginTop: 10 }}>
                      <Toggle on={p.live}
                        label={p.live ? 'Live' : 'Coming soon'}
                        onChange={v => run(async () => {
                          await api.setProgramme(p.id, { live: v })
                          await loadP()
                        })} />
                      <div style={{ flex: 1 }} />
                      {p.archived ? (
                        <Btn small tone="line" onClick={() => run(async () => {
                          await api.archiveProgramme(p.id, false); await loadP()
                        })}>Bring back</Btn>
                      ) : (
                        <Btn small tone="line"
                          onClick={() => setDeleting(p)}>Archive or delete</Btn>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </Sortable>
          </>
        )}

        {tab === 'splash' && (
          <div style={{ maxWidth: 520 }}>
            <p style={{ ...T.body, marginBottom: 20 }}>
              What plays behind the login screen. The photo sits underneath the
              video as a poster frame, so a slow connection sees a good still
              rather than black.
            </p>

            <Field label="Video"
              hint="Four to six seconds, no audio track, looping cleanly, under about 1.5MB. Leave it empty and the photo carries the screen on its own.">
              <ImagePicker kind="video" wide value={cfg.splash_video || ''}
                onChange={v => patchCfg('splash_video', v || '')} />
            </Field>

            <Field label="Poster photo"
              hint="Shown while the video loads, and instead of it on anything that won't autoplay.">
              <ImagePicker wide value={cfg.splash_poster || ''}
                onChange={v => patchCfg('splash_poster', v || '')} />
            </Field>

            <Field label="The mark"
              hint="Export it light — cream on transparent. The light theme inverts it, so one file covers both.">
              <ImagePicker value={cfg.logo_url || ''}
                onChange={v => patchCfg('logo_url', v || '')} />
            </Field>

            <div style={{ background: C.card, border: `1px solid ${C.line}`,
              borderRadius: 12, padding: 14, marginTop: 6, boxShadow: C.shadow }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Before you upload</div>
              <div style={{ ...T.body, fontSize: 12.5, marginTop: 6 }}>
                MOV won't play outside Safari — convert to MP4 first. And strip the
                audio rather than muting it: iOS is fussier about that than you'd
                expect, and a video with a silent track sometimes refuses to
                autoplay at all.
              </div>
            </div>
          </div>
        )}

        {tab === 'words' && (
          <div style={{ maxWidth: 460 }}>
            {[['login_headline', 'Login headline', 'Train with intent.'],
              ['home_greeting', 'Greeting', 'Morning'],
              ['race_name', 'Race name', 'HYROX London ExCeL'],
              ['app_name', 'App name', 'Salus Train']].map(([k, label, ph]) => (
              <Field key={k} label={label}>
                <Save value={cfg[k] ?? ''} placeholder={ph}
                  onSave={v => patchCfg(k, v)} />
              </Field>
            ))}
            <Field label="Half multiplier"
              hint="Full time ÷ half time. 2.08 came from one member's race. Change it once your first cohort has raced.">
              <Save value={cfg.half_multiplier ?? ''} placeholder="2.08"
                onSave={v => patchCfg('half_multiplier', v)} />
            </Field>
          </div>
        )}
      </div>

      <HomePreview sections={sections}
        programmes={programmes.filter(p => !p.archived)} cfg={cfg} />

      {deleting && (
        <DeleteProgramme programme={deleting}
          programmes={programmes.filter(p => !p.archived)}
          onClose={() => setDeleting(null)}
          onDone={async () => { setDeleting(null); await loadP() }} />
      )}
    </div>
  )
}

/* A phone showing the arrangement. Deliberately rough on detail —
   it's for judging order and presence, not pixels. */
function HomePreview({ sections, programmes, cfg }) {
  const on = sections.filter(s => s.visible)
  return (
    <div style={{ position: 'sticky', top: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: A.mute,
        letterSpacing: '.1em', marginBottom: 10 }}>WHAT THEY SEE</div>
      <div style={{ ...previewVars, width: 300, background: '#0B0A09',
        borderRadius: 26, border: '1px solid #2B2926', padding: 8,
        boxShadow: '0 12px 40px rgba(26,22,19,.22)' }}>
        <div className="nb" style={{ background: '#0B0A09', borderRadius: 20,
          height: 560, overflowY: 'auto', padding: 13, color: '#EFEAE1' }}>
          {on.map(s => <Block key={s.id} s={s} programmes={programmes} cfg={cfg} />)}
          {on.length === 0 && (
            <div style={{ fontSize: 12.5, color: '#635C54', padding: '40px 0',
              textAlign: 'center' }}>Everything is switched off.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Block({ s, programmes, cfg }) {
  const card = { background: '#151412', borderRadius: 13, padding: 12,
    marginBottom: 9 }
  const head = { fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em',
    color: '#635C54', margin: '14px 0 7px' }

  if (s.key === 'greeting') return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
      <div>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.03em' }}>
          {cfg.home_greeting || 'Morning'}, Luke
        </div>
        <div style={{ fontSize: 10.5, color: '#948D83', marginTop: 2 }}>
          Week 1 of 8 · Road to HYROX
        </div>
      </div>
    </div>
  )

  if (s.key === 'daystrip') return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)',
      marginBottom: 12 }}>
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
        <div key={i} style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10.5, fontWeight: i === 0 ? 700 : 500,
            color: i === 0 ? '#EFEAE1' : '#635C54' }}>{d}</span>
          <span style={{ width: 4, height: 4, borderRadius: 999,
            background: i === 0 ? '#EFEAE1' : 'transparent' }} />
        </div>
      ))}
    </div>
  )

  if (s.key === 'countdown') return (
    <div style={card}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.13em',
        color: '#E8DCC8' }}>{(cfg.race_name || 'HYROX LONDON EXCEL').toUpperCase()}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-.05em' }}>102</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#948D83' }}>days to go</span>
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 10 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 999,
            background: i === 0 ? 'rgba(232,220,200,.4)' : '#2B2926' }} />
        ))}
      </div>
    </div>
  )

  if (s.key === 'session') return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div style={{ height: 108, background: 'linear-gradient(150deg,#312A22,#191714)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: 12 }}>
        <div style={{ fontSize: 10, color: 'rgba(246,242,236,.7)' }}>Salus · Mon</div>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.03em',
          marginTop: 2 }}>Back Squat 5RM</div>
        <div style={{ background: '#F6F2EC', color: '#0B0A09', borderRadius: 999,
          padding: '8px 0', textAlign: 'center', fontSize: 11.5, fontWeight: 700,
          marginTop: 10 }}>View session</div>
      </div>
    </div>
  )

  if (s.key === 'notices') return (
    <>
      {s.heading && <div style={head}>{s.heading}</div>}
      <div style={card}>
        <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '.12em',
          color: '#E8DCC8' }}>RACE DAY</div>
        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
          ExCeL group travel is open
        </div>
      </div>
    </>
  )

  if (s.key === 'programmes') return (
    <>
      {s.heading && <div style={head}>{s.heading}</div>}
      {/* All of them, not the first three — the app shows every one,
          and a preview that quietly truncates is worse than no preview. */}
      {(programmes.length ? programmes : [{ id: 0, name: 'Road to HYROX', live: true }])
        .map(p => (
        <div key={p.id} style={{ ...card, padding: 0, overflow: 'hidden',
          opacity: p.live ? 1 : .6 }}>
          <div style={{ height: 72, padding: 10, display: 'flex',
            flexDirection: 'column', justifyContent: 'flex-end',
            background: p.cover_url
              ? `#0B0A09 url(${p.cover_url}) center/cover`
              : 'linear-gradient(150deg,#312A22,#191714)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-.03em',
              color: '#F6F2EC', textShadow: '0 1px 6px rgba(0,0,0,.7)' }}>{p.name}</div>
          </div>
        </div>
      ))}
    </>
  )

  return null
}
