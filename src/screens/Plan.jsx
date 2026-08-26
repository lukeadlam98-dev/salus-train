import { useState, useEffect } from 'react'
import { C, T } from '../lib/theme'
import { DAYS } from '../lib/format'
import { getSessions } from '../lib/data'
import { Card, Label, Tag, page } from '../components/ui'

export default function Plan({ week, programme, onOpen }) {
  const [sessions, setSessions] = useState([])
  useEffect(() => { if (week) getSessions(week.id).then(setSessions) }, [week])

  return (
    <div style={page}>
      <h1 style={T.h1}>The plan</h1>
      <p style={{ ...T.body, marginTop: 5 }}>
        {week?.phase} — {week?.note}
      </p>

      <div style={{ display: 'flex', gap: 8, marginTop: 18, overflowX: 'auto' }}>
        {Array.from({ length: programme?.total_weeks ?? 8 }, (_, i) => i + 1).map(w => (
          <button key={w} disabled={w !== 1} style={{
            flex: '0 0 auto', width: 42, height: 42, borderRadius: 12,
            cursor: w === 1 ? 'pointer' : 'default', fontFamily: 'inherit',
            fontSize: 15, fontWeight: 800, border: 'none',
            background: w === 1 ? C.ink : C.card2,
            color: w === 1 ? C.bg : C.mute, opacity: w === 1 ? 1 : .5,
          }}>{w}</button>
        ))}
      </div>

      <Card style={{ marginTop: 16, padding: '3px 15px' }}>
        {sessions.map((s, i) => (
          <div key={s.id} onClick={() => s.kind !== 'rest' && onOpen(s)}
            style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 0',
              cursor: s.kind !== 'rest' ? 'pointer' : 'default',
              borderTop: i ? `1px solid ${C.line}` : 'none' }}>
            <div style={{ width: 34, fontSize: 12.5, fontWeight: 700, color: C.mute }}>
              {DAYS[s.day - 1]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700,
                color: s.kind === 'rest' ? C.sub : C.ink }}>{s.title}</div>
              <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>{s.tag}</div>
            </div>
            {s.is_test && (
              <Tag tone={s.kind === 'half' ? 'key' : undefined}>
                {s.kind === 'half' ? 'KEY' : 'TEST'}
              </Tag>
            )}
          </div>
        ))}
      </Card>
    </div>
  )
}
