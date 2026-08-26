import { C } from '../lib/theme'

// Loading shapes that match what's coming, rather than the word
// "Loading". On gym wifi the wait is a real part of the experience,
// and a shape that resolves into content feels quicker than a word
// that vanishes — even when it takes exactly as long.

const Shimmer = ({ w = '100%', h = 14, r = 7, style }) => (
  <div style={{
    width: w, height: h, borderRadius: r, background: C.card2,
    animation: 'shimmer 1.4s ease-in-out infinite', ...style,
  }} />
)

export const SkeletonToday = () => (
  <div style={{ padding: '46px 16px 110px', maxWidth: 520, margin: '0 auto' }}>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div>
        <Shimmer w={168} h={22} />
        <Shimmer w={128} h={12} style={{ marginTop: 8 }} />
      </div>
      <div style={{ flex: 1 }} />
      <Shimmer w={30} h={30} r={999} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)',
      gap: 8, marginTop: 22 }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Shimmer key={i} h={26} r={8} />
      ))}
    </div>

    <Shimmer h={132} r={18} style={{ marginTop: 18 }} />
    <Shimmer h={248} r={18} style={{ marginTop: 11 }} />

    <Shimmer w={132} h={11} style={{ marginTop: 28 }} />
    <Shimmer h={92} r={16} style={{ marginTop: 12 }} />
  </div>
)

export const SkeletonList = ({ rows = 5, header = true }) => (
  <div style={{ padding: '46px 16px 110px', maxWidth: 520, margin: '0 auto' }}>
    {header && (
      <>
        <Shimmer w={148} h={22} />
        <Shimmer w={230} h={12} style={{ marginTop: 10 }} />
      </>
    )}
    <div style={{ background: C.card, borderRadius: 18, padding: '4px 15px',
      marginTop: 22 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12,
          padding: '15px 0',
          borderTop: i ? `1px solid ${C.line}` : 'none' }}>
          <Shimmer w={30} h={30} r={999} />
          <div style={{ flex: 1 }}>
            <Shimmer w={`${52 + (i % 3) * 14}%`} h={13} />
            <Shimmer w={`${34 + (i % 2) * 12}%`} h={10} style={{ marginTop: 7 }} />
          </div>
          <Shimmer w={44} h={14} />
        </div>
      ))}
    </div>
  </div>
)

export const SkeletonSession = () => (
  <div style={{ maxWidth: 520, margin: '0 auto' }}>
    <Shimmer h={240} r={0} />
    <div style={{ padding: '18px 16px' }}>
      <Shimmer h={150} r={18} />
      <Shimmer h={118} r={18} style={{ marginTop: 12 }} />
      <Shimmer h={54} r={999} style={{ marginTop: 18 }} />
    </div>
  </div>
)

export default Shimmer
