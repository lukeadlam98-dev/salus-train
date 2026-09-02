import { C, T, F } from '../lib/theme'
import { Ico, I } from './ui'

// An empty state should say what happens next, not that nothing is
// here. Day one is the only day every member experiences, and right
// now it's the emptiest version of the product — so it's the one
// worth writing properly.
export default function Empty({ icon, title, body, action, onAction, quiet }) {
  return (
    <div style={{
      background: quiet ? 'transparent' : C.card,
      border: quiet ? `1px dashed ${C.line}` : 'none',
      borderRadius: 18, padding: quiet ? '30px 22px' : '28px 22px',
      textAlign: 'center', animation: 'up .3s ease',
    }}>
      {icon && (
        <div style={{ width: 42, height: 42, borderRadius: 999,
          background: C.card2, display: 'grid', placeItems: 'center',
          margin: '0 auto 15px' }}>
          <Ico d={icon} s={19} c={C.sub} w={1.8} />
        </div>
      )}
      <div style={{ ...T.h3, fontSize: 17 }}>{title}</div>
      <div style={{ ...T.body, fontSize: 14, marginTop: 8,
        maxWidth: 290, marginLeft: 'auto', marginRight: 'auto' }}>{body}</div>
      {action && (
        <button onClick={onAction} style={{
          marginTop: 18, border: 'none', borderRadius: 999, padding: '13px 24px',
          fontSize: 14.5, fontWeight: 700, fontFamily: F, cursor: 'pointer',
          background: C.ink, color: C.bg,
        }}>{action}</button>
      )}
    </div>
  )
}
