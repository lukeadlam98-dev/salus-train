import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { A, previewVars } from './theme'
import * as api from './api'
import { Save, Field, Toggle, Btn, Sortable, Grip } from './widgets'

// The four tabs, and what sits inside two of them.
//
// The key is never editable. It's what the app routes on, and letting
// someone rename it would break the app in a way that looks like a bug
// rather than a setting. The label is what members read, and that they
// can have.
export default function Navigation() {
  const [tab, setTab] = useState('tabs')
  const [tabs, setTabs] = useState([])
  const [home, setHome] = useState([])
  const [comm, setComm] = useState([])
  const [err, setErr] = useState(null)

  const run = async fn => {
    setErr(null)
    try { await fn() } catch (e) { setErr(e.message || 'That didn\u2019t save.') }
  }

  const load = () => Promise.all([
    api.listTabs().then(setTabs),
    api.listSections().then(setHome),
    api.listCommunitySections().then(setComm),
  ]).catch(e => setErr(e.message))

  useEffect(() => { load() }, [])

  const visible = tabs.filter(t => t.visible)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px',
      gap: 34, alignItems: 'start' }}>

      <div style={{ minWidth: 0 }}>
        <h1 style={T.h1}>The app</h1>
        <p style={{ ...T.body, marginTop: 7, maxWidth: 560 }}>
          The four tabs along the bottom, and what sits inside them. Renaming a
          tab changes what members read, not where it goes.
        </p>

        {err && (
          <div style={{ background: C.card, border: `1px solid ${C.line}`,
            borderRadius: 10, padding: '11px 14px', fontSize: 13, color: C.red,
            marginTop: 16 }}>{err}</div>
        )}

        <div style={{ display: 'flex', gap: 7, margin: '22px 0 18px' }}>
          {[['tabs', 'The tabs'], ['home', 'Train'],
            ['community', 'Community']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ borderRadius: 8, padding: '8px 14px', fontSize: 13,
                fontWeight: 600, cursor: 'pointer', fontFamily: F,
                background: tab === k ? C.ink : C.card,
                border: `1px solid ${tab === k ? C.ink : C.line}`,
                color: tab === k ? C.bg : C.sub }}>{l}</button>
          ))}
        </div>

        {/* ---- the tabs ---- */}
        {tab === 'tabs' && (
          <>
            <Sortable ids={tabs.map(t => t.id)}
              onReorder={ids => run(async () => {
                await api.reorderTabs(ids)
                setTabs(ids.map(id => tabs.find(t => t.id === id)))
              })}>
              {tabs.map(t => (
                <div key={t.id} style={{ background: C.card, borderRadius: 13,
                  border: `1px solid ${C.line}`, boxShadow: C.shadow, padding: 14,
                  marginBottom: 9, display: 'flex', alignItems: 'center', gap: 13,
                  opacity: t.visible ? 1 : .5 }}>
                  <Grip />
                  <div style={{ width: 168, flexShrink: 0 }}>
                    <Save value={t.label}
                      onSave={v => run(() => api.setTab(t.id, { label: v }))} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.45 }}>
                      {t.note}
                    </div>
                    <div style={{ fontSize: 10.5, color: C.mute, marginTop: 4,
                      fontFamily: 'ui-monospace, monospace' }}>{t.key}</div>
                  </div>
                  <Toggle on={t.visible} label={t.visible ? 'On' : 'Off'}
                    onChange={v => run(async () => {
                      await api.setTab(t.id, { visible: v })
                      setTabs(tabs.map(x => x.id === t.id ? { ...x, visible: v } : x))
                    })} />
                </div>
              ))}
            </Sortable>
            <div style={{ ...T.body, fontSize: 12.5, marginTop: 14,
              maxWidth: 520 }}>
              Switching a tab off hides it from members but leaves everything in
              it intact. Train can't be hidden — it's where the app opens.
            </div>
          </>
        )}

        {/* ---- what's on Train ---- */}
        {tab === 'home' && (
          <SectionList rows={home}
            onReorder={ids => run(async () => {
              await api.reorderSections(ids)
              setHome(ids.map(id => home.find(s => s.id === id)))
            })}
            onToggle={(s, v) => run(async () => {
              await api.setSection(s.id, { visible: v })
              setHome(home.map(x => x.id === s.id ? { ...x, visible: v } : x))
            })}
            onHeading={(s, v) => run(() => api.setSection(s.id, { heading: v }))} />
        )}

        {/* ---- what's on Community ---- */}
        {tab === 'community' && (
          <SectionList rows={comm}
            onReorder={ids => run(async () => {
              await api.reorderCommunitySections(ids)
              setComm(ids.map(id => comm.find(s => s.id === id)))
            })}
            onToggle={(s, v) => run(async () => {
              await api.setCommunitySection(s.id, { visible: v })
              setComm(comm.map(x => x.id === s.id ? { ...x, visible: v } : x))
            })}
            onHeading={(s, v) =>
              run(() => api.setCommunitySection(s.id, { heading: v }))} />
        )}
      </div>

      {/* ---- the tab bar as they'll see it ---- */}
      <div style={{ position: 'sticky', top: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: A.mute,
          letterSpacing: '.1em', marginBottom: 10 }}>WHAT THEY SEE</div>
        <div style={{ ...previewVars, width: 300, background: '#0A0A09',
          borderRadius: 26, border: '1px solid #2A2926', padding: 8,
          boxShadow: '0 12px 40px rgba(26,22,19,.22)' }}>
          <div style={{ height: 470, borderRadius: 20, position: 'relative',
            background: '#0A0A09', padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em',
              color: '#5E5B56' }}>
              {(visible[0]?.label || 'TRAIN').toUpperCase()}
            </div>

            <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12,
              background: '#161514', border: '1px solid #262523',
              borderRadius: 999, padding: 5, display: 'grid',
              gridTemplateColumns: `repeat(${Math.max(1, visible.length)},1fr)` }}>
              {visible.map((t, i) => (
                <div key={t.id} style={{ display: 'grid', justifyItems: 'center',
                  gap: 3, padding: '8px 0 7px', borderRadius: 999,
                  background: i === 0 ? '#2A2926' : 'transparent' }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4,
                    background: i === 0 ? '#EDE9E2' : '#3A3733' }} />
                  <span style={{ fontSize: 8.5, fontWeight: i === 0 ? 700 : 600,
                    color: i === 0 ? '#EDE9E2' : '#5E5B56',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', maxWidth: 62 }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: A.mute, marginTop: 11, lineHeight: 1.5,
          width: 300 }}>
          Long labels get cut rather than wrapping. Two words is the practical
          limit at four tabs.
        </div>
      </div>
    </div>
  )
}

function SectionList({ rows, onReorder, onToggle, onHeading }) {
  return (
    <Sortable ids={rows.map(s => s.id)} onReorder={onReorder}>
      {rows.map(s => (
        <div key={s.id} style={{ background: C.card, borderRadius: 13,
          border: `1px solid ${C.line}`, boxShadow: C.shadow, padding: 14,
          marginBottom: 9, display: 'flex', alignItems: 'center', gap: 13,
          opacity: s.visible ? 1 : .5 }}>
          <Grip />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2,
              lineHeight: 1.45 }}>{s.note}</div>
            {s.heading != null && (
              <div style={{ marginTop: 8, maxWidth: 320 }}>
                <Save value={s.heading} placeholder="Heading above it"
                  onSave={v => onHeading(s, v)} />
              </div>
            )}
          </div>
          <Toggle on={s.visible} label={s.visible ? 'On' : 'Off'}
            onChange={v => onToggle(s, v)} />
        </div>
      ))}
    </Sortable>
  )
}
