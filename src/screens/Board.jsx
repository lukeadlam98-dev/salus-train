import { useState, useEffect } from 'react'
import { C, T } from '../lib/theme'
import { hhmm } from '../lib/format'
import { getLeaderboard } from '../lib/data'
import { Card, Label, Medal, Avatar, Btn, page } from '../components/ui'

export default function Board({ profile, onShare }) {
  const [rows, setRows] = useState([])
  useEffect(() => { getLeaderboard().then(setRows) }, [])

  return (
    <div style={page}>
      <h1 style={T.h1}>Leaderboard</h1>
      <p style={{ ...T.body, marginTop: 5 }}>
        Projected finishes from the week 1 half. The test never changes, so these
        compare properly.
      </p>

      {!profile?.share_on_leaderboard && (
        <Card style={{ marginTop: 18, background: C.card2 }}>
          <div style={{ ...T.body, fontSize: 13.5 }}>
            You're not on the board. Sharing puts your name and projected time in front
            of everyone else training for December.
          </div>
          <Btn tone="soft" style={{ marginTop: 13, padding: '13px 0', fontSize: 14.5 }}
            onClick={onShare}>Share my time</Btn>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card style={{ marginTop: 18 }}>
          <div style={{ ...T.body }}>
            Nobody has finished a half yet. First one on the board sets the bar.
          </div>
        </Card>
      ) : (
        <Card style={{ marginTop: 18, padding: '4px 15px' }}>
          {rows.map((r, i) => {
            const me = r.name === profile?.name
            return (
              <div key={`${r.name}-${i}`} style={{ display: 'flex', alignItems: 'center',
                gap: 12, padding: '13px 0',
                borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                <Medal rank={i + 1} />
                <Avatar name={r.name} size={30} />
                <div style={{ flex: 1, fontSize: 15.5, fontWeight: 700,
                  color: me ? C.g : C.ink }}>{r.name}{me ? ' · you' : ''}</div>
                <div style={{ fontSize: 16, fontWeight: 800, ...T.num }}>
                  {hhmm(r.projected_s)}
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
