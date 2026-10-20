// Render the live session screen to /tmp/logo/session.html so it can
// be looked at in a browser. The screen is the one place in this app
// where a design decision is only testable by eye — whether a set
// reads at a glance, standing up, between two machines.
//
//   node tools/session-shot.mjs
//
import { JSDOM } from 'jsdom'
import { build } from 'esbuild'
import fs from 'node:fs'
const SESSION = { id:'s1', title:'Squat & Press', day:3, kind:'strength', est_min:55,
  body:'Supersets. Work through A1 and A2 together.', cover_url:null, video_url:null,
  is_test:false, wotw:false, focus:'Squat, shoulders and legs' }
const BLOCKS = [{
  id:'b1', ord:1, letter:'A', label:'Squat & press', scheme:'Superset · 3 sets',
  format:'superset', rounds:3, rest_s:90, cap_s:null, window_s:null, work_s:null,
  ladder:null, target_pct:null, target_rpe:null, pace_pct:null,
  block_lines:[], coach_notes:[],
  block_items:[
    { id:'i1', ord:1, sets:3, reps:10, rest_s:90,
      movements:{ id:'m1', name:'Goblet Squat', has_time:false, pct_of:null, pct:null } },
    { id:'i2', ord:2, sets:3, reps:12, rest_s:90,
      movements:{ id:'m2', name:'Machine Chest Press', has_time:false, pct_of:null, pct:null } },
  ],
}]
const LAST = { m1:{ kg:32, reps:10 }, m2:{ kg:45, reps:12 } }
const stub = { name:'s', setup(b){
  b.onResolve({filter:/lib\/(data|supabase|push)$/},a=>({path:a.path,namespace:'s'}))
  b.onLoad({filter:/.*/,namespace:'s'},a=>({loader:'js',contents:/data$/.test(a.path)
    ? `export const getSessionDetail=async()=>globalThis.__B
       export const startWorkout=async()=>({id:'w1'})
       export const saveSet=async()=>({}); export const finishWorkout=async()=>({})
       export const getCoaches=async()=>[]
       export const getLastLoads=async()=>globalThis.__L
       export const getProgrammes=async()=>[]`
    : `export const supabase={from:()=>({select:()=>({})})}; export default {}`}))
}}
await build({ entryPoints:['tools/_superset-entry.jsx'], bundle:true, format:'esm',
  jsx:'automatic', outfile:'.shot.mjs', plugins:[stub], logLevel:'error',
  external:['react','react-dom','react-dom/client','react/jsx-runtime'],
  define:{'import.meta.env':'{"VITE_SUPABASE_URL":"https://x.co","VITE_SUPABASE_ANON_KEY":"x"}'} })
const dom = new JSDOM('<!doctype html><div id="root"></div>',{url:'https://x.test',pretendToBeVisual:true})
for (const k of ['window','document','navigator','HTMLElement','Element','Node',
  'getComputedStyle','localStorage','MutationObserver','requestAnimationFrame','cancelAnimationFrame'])
  Object.defineProperty(globalThis,k,{value:dom.window[k],configurable:true,writable:true})
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.__B = BLOCKS; globalThis.__L = LAST
const { mount } = await import('./.shot.mjs')
const html = await mount(SESSION)
const whole = fs.readFileSync('src/lib/theme.js','utf8')
const theme = whole.slice(whole.indexOf('export const PAL = {'),
                          whole.indexOf('export const vars'))
const pal = {}; for (const m of theme.matchAll(/^\s{2}(\w+):\s*'([^']+)'/gm)) pal[m[1]]=m[2]
const css = Object.entries(pal).map(([k,v])=>`--${k}:${v}`).join(';')
fs.writeFileSync('/tmp/logo/session.html',
`<!doctype html><meta charset=utf-8>
<link rel=preconnect href=https://fonts.gstatic.com>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel=stylesheet>
<style>${fs.readFileSync('src/index.css','utf8')}</style>
<style>:root{${css}}*{box-sizing:border-box}body{margin:0;background:var(--bg);
color:var(--ink);font-family:Inter,system-ui;-webkit-font-smoothing:antialiased}
@keyframes pop{from{transform:scale(.8)}to{transform:scale(1)}}</style>
<body>${html}</body>`)
fs.rmSync('.shot.mjs',{force:true})
dom.window.close(); console.log('html written'); process.exit(0)
