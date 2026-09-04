#!/bin/bash
# Everything that must pass before a build ships.
#
# Two black screens got past a build that compiled cleanly:
#   · a useEffect reading a state variable declared below it
#   · a component using useState in a file with no React import
#
# Both are valid syntax, so esbuild is happy. Both throw on first
# render, before any error boundary exists, so the page is simply
# black. The only thing that catches them is rendering every screen.
set -e
cd "$(dirname "$0")/.."

echo "· hooks imported where they're used"
node - <<'NODE'
const fs=require('fs'),path=require('path')
const files=[];(function w(d){fs.readdirSync(d,{withFileTypes:true}).forEach(e=>{
  const p=path.join(d,e.name); if(e.isDirectory())w(p)
  else if(/\.jsx?$/.test(e.name))files.push(p)})})('src')
const HOOKS=['useState','useEffect','useRef','useMemo','useCallback','useReducer']
let bad=0
files.forEach(f=>{
  const s=fs.readFileSync(f,'utf8'); const has=new Set()
  ;[...s.matchAll(/import\s+(?:React,\s*)?\{([^}]*)\}\s*from\s*'react'/g)]
    .forEach(m=>m[1].split(',').forEach(x=>has.add(x.trim())))
  HOOKS.forEach(h=>{
    if(new RegExp('(?<![\\w.])'+h+'\\s*\\(').test(s) && !has.has(h)){
      console.log('  ✗ '+f+' uses '+h+' without importing it'); bad++ }})
})
if(bad) process.exit(1)
console.log('  ok')
NODE

echo "· building every screen"
node - <<'NODE' > /tmp/salus-screens.jsx
const fs=require('fs')
const out=[]
;['screens','components'].forEach(d=>{
  fs.readdirSync('src/'+d).filter(f=>f.endsWith('.jsx')).sort().forEach(f=>{
    if(!fs.readFileSync('src/'+d+'/'+f,'utf8').includes('export default'))return
    out.push(`export { default as ${f.slice(0,-4).replace(/-/g,'')} } from './src/${d}/${f.slice(0,-4)}'`)
  })
})
out.push("export { default as App } from './src/App'")
console.log(out.join('\n'))
NODE
cp /tmp/salus-screens.jsx ./.screens-entry.jsx
npx --yes esbuild@0.21.5 .screens-entry.jsx --bundle --format=esm --jsx=automatic \
  --outfile=/tmp/salus-screens.mjs \
  --external:react --external:react-dom --external:react/jsx-runtime \
  --external:@supabase/supabase-js \
  --define:import.meta.env='{"VITE_SUPABASE_URL":"https://x.supabase.co","VITE_SUPABASE_ANON_KEY":"x"}' \
  >/dev/null
rm -f .screens-entry.jsx
echo "  ok"

echo "· rendering every screen"
node tools/render-check.mjs /tmp/salus-screens.mjs
