import { C, T } from '../lib/theme'
import { Mark, page } from './ui'

// Coming soon, said once and honestly.
//
// A tab that opens onto a half-built screen is worse than one that
// says it isn't ready — the first makes a member wonder what they did
// wrong, the second just closes the question. It keeps the tab in the
// bar so the shape of the app is visible from day one.
export default function Soon({ title, body }) {
  return (
    <div style={{ ...page, display: 'grid', placeItems: 'center',
      minHeight: '70vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 300 }}>
        <div style={{ opacity: .3, display: 'grid', placeItems: 'center',
          marginBottom: 22 }}>
          <Mark s={34} />
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.16em',
          color: C.mute }}>COMING SOON</div>
        <div style={{ ...T.h1, fontSize: 26, marginTop: 10 }}>{title}</div>
        <div style={{ ...T.body, fontSize: 14, marginTop: 10,
          lineHeight: 1.6 }}>{body}</div>
      </div>
    </div>
  )
}
