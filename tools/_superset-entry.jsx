// Entry for superset-check.mjs. Mounts the real Session screen and
// waits for its effects before handing the markup back.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import Session from '../src/screens/Session'

export async function mount(session) {
  const el = document.getElementById('root')
  const root = createRoot(el)
  await act(async () => {
    root.render(
      <Session session={session} userId="u1" benchmarks={{}}
        onBack={() => {}} onFinished={() => {}} />
    )
  })
  // One more flush: the detail arrives in an effect, and the blocks
  // only render on the pass after that.
  await act(async () => { await new Promise(r => setTimeout(r, 0)) })

  // The set grid is behind "Start workout" — a member reads the
  // session first and logs second, so the test has to press it too.
  const start = [...el.querySelectorAll('button')]
    .find(b => /start workout/i.test(b.textContent || ''))
  if (!start) throw new Error('no "Start workout" button to press')
  await act(async () => { start.click() })
  await act(async () => { await new Promise(r => setTimeout(r, 0)) })

  return el.innerHTML
}
