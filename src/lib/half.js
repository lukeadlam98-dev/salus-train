// The Salus Half — protocol and projection.
//
// Half of everything, full race weight, in race order, on one clock.
// The multiplier lives in the `config` table so it can be corrected
// once the first cohort has raced. 2.08 is derived from one member's
// full race, not from anyone yet doing this half.

export const LEGS = [
  { key: 'r1',   type: 'run', name: 'Run 1',              dist: '500m' },
  { key: 'ski',  type: 'stn', name: 'SkiErg',             dist: '500m', load: 'Cleared monitor' },
  { key: 'r2',   type: 'run', name: 'Run 2',              dist: '500m' },
  { key: 'push', type: 'stn', name: 'Sled Push',          dist: '25m',  load: '152 / 102kg' },
  { key: 'r3',   type: 'run', name: 'Run 3',              dist: '500m' },
  { key: 'pull', type: 'stn', name: 'Sled Pull',          dist: '25m',  load: '103 / 78kg' },
  { key: 'r4',   type: 'run', name: 'Run 4',              dist: '500m' },
  { key: 'burp', type: 'stn', name: 'Burpee Broad Jump',  dist: '40m' },
  { key: 'r5',   type: 'run', name: 'Run 5',              dist: '500m' },
  { key: 'row',  type: 'stn', name: 'Row',                dist: '500m', load: 'Cleared monitor' },
  { key: 'r6',   type: 'run', name: 'Run 6',              dist: '500m' },
  { key: 'farm', type: 'stn', name: 'Farmers Carry',      dist: '100m', load: '2×24 / 2×16kg' },
  { key: 'r7',   type: 'run', name: 'Run 7',              dist: '500m' },
  { key: 'lung', type: 'stn', name: 'Sandbag Lunge',      dist: '50m',  load: '20 / 10kg' },
  { key: 'r8',   type: 'run', name: 'Run 8',              dist: '500m' },
  { key: 'wall', type: 'stn', name: 'Wall Balls',         dist: '50',   load: '6kg 10ft / 4kg 9ft' },
]

export const DEFAULT_MULTIPLIER = 2.08

export function summarise(splits, multiplier = DEFAULT_MULTIPLIER) {
  const got = LEGS.map(l => ({ ...l, s: splits[l.key] })).filter(x => x.s != null)
  const runs = got.filter(x => x.type === 'run').reduce((a, b) => a + b.s, 0)
  const stns = got.filter(x => x.type === 'stn').reduce((a, b) => a + b.s, 0)
  const total = runs + stns
  const complete = got.length === LEGS.length

  // The station furthest above the member's own station average.
  let weakest = null
  const st = got.filter(x => x.type === 'stn')
  if (st.length >= 4) {
    const avg = st.reduce((a, b) => a + b.s, 0) / st.length
    weakest = st.map(x => ({ ...x, over: x.s - avg }))
      .sort((a, b) => b.over - a.over)[0]
  }

  return {
    runs, stns, total, complete, weakest,
    done: got.length,
    projected: complete ? Math.round(total * multiplier) : null,
  }
}
