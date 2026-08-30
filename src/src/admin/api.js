// Every admin query in one place.
import { supabase } from '../lib/supabase'

/* ---------------- weeks ---------------- */
export async function listWeeks(slug = 'road-to-hyrox') {
  const { data, error } = await supabase
    .from('weeks').select('*, programmes!inner(slug,name)')
    .eq('programmes.slug', slug).order('idx')
  if (error) throw error
  return data || []
}

export async function duplicateWeek(src, dest, slug = 'road-to-hyrox') {
  const { data, error } = await supabase.rpc('duplicate_week', {
    src_idx: src, dest_idx: dest, prog_slug: slug,
  })
  if (error) throw error
  return data
}

export async function setWeek(id, patch) {
  const { error } = await supabase.from('weeks').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteWeek(id) {
  const { error } = await supabase.from('weeks').delete().eq('id', id)
  if (error) throw error
}

/* ---------------- sessions ---------------- */
export async function listSessions(weekId) {
  const { data, error } = await supabase
    .from('sessions').select('*').eq('week_id', weekId).order('day')
  if (error) throw error
  return data || []
}

export async function setSession(id, patch) {
  const { error } = await supabase.from('sessions').update(patch).eq('id', id)
  if (error) throw error
}

export async function addSession(weekId, day) {
  const { data, error } = await supabase.from('sessions').insert({
    week_id: weekId, day, title: 'New session', kind: 'strength',
  }).select().single()
  if (error) throw error
  return data
}

export async function deleteSession(id) {
  const { error } = await supabase.from('sessions').delete().eq('id', id)
  if (error) throw error
}

/* ---------------- blocks and children ---------------- */
export async function getBlocks(sessionId) {
  const { data, error } = await supabase
    .from('blocks')
    .select('*, block_lines(*), coach_notes(*), block_items(*, movements(*))')
    .eq('session_id', sessionId).order('ord')
  if (error) throw error
  return (data || []).map(b => ({
    ...b,
    block_lines: (b.block_lines || []).sort((a, c) => a.ord - c.ord),
    coach_notes: (b.coach_notes || []).sort((a, c) => a.ord - c.ord),
    block_items: (b.block_items || []).sort((a, c) => a.ord - c.ord),
  }))
}

export async function addBlock(sessionId, ord) {
  const letters = ['W', 'A', 'B', 'C', 'D', 'E']
  const { data, error } = await supabase.from('blocks').insert({
    session_id: sessionId, ord,
    letter: letters[Math.min(ord - 1, letters.length - 1)],
    label: 'New block',
  }).select().single()
  if (error) throw error
  return data
}

export const setBlock = (id, patch) =>
  supabase.from('blocks').update(patch).eq('id', id)
export const deleteBlock = id =>
  supabase.from('blocks').delete().eq('id', id)

export const addLine = (blockId, ord) =>
  supabase.from('block_lines')
    .insert({ block_id: blockId, ord, prescription: '', movement: '' })
    .select().single()
export const setLine = (id, patch) =>
  supabase.from('block_lines').update(patch).eq('id', id)
export const deleteLine = id =>
  supabase.from('block_lines').delete().eq('id', id)

export const addNote = (blockId, ord) =>
  supabase.from('coach_notes')
    .insert({ block_id: blockId, ord, heading: '', body: '' })
    .select().single()
export const setNote = (id, patch) =>
  supabase.from('coach_notes').update(patch).eq('id', id)
export const deleteNote = id =>
  supabase.from('coach_notes').delete().eq('id', id)

/* ---------------- movements and loggable items ---------------- */
export async function listMovements() {
  const { data } = await supabase.from('movements').select('*').order('name')
  return data || []
}

export const addItem = (blockId, movementId, ord) =>
  supabase.from('block_items')
    .insert({ block_id: blockId, movement_id: movementId, ord, sets: 3, reps: 10 })
    .select('*, movements(*)').single()
export const setItem = (id, patch) =>
  supabase.from('block_items').update(patch).eq('id', id)
export const deleteItem = id =>
  supabase.from('block_items').delete().eq('id', id)

export const addMovement = row =>
  supabase.from('movements').insert(row).select().single()
export const setMovement = (id, patch) =>
  supabase.from('movements').update(patch).eq('id', id)

/* ---------------- images ---------------- */
const BUCKET = 'Photos'

export async function listImages() {
  const { data, error } = await supabase.storage.from(BUCKET)
    .list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })
  if (error) throw error
  return (data || [])
    .filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f.name))
    .map(f => ({ ...f, url: publicUrl(f.name) }))
}

export function publicUrl(name) {
  return supabase.storage.from(BUCKET).getPublicUrl(name).data.publicUrl
}

export async function uploadImage(file) {
  // Keep the original name but make it unique, so re-uploading a photo
  // never silently replaces one another session is already using.
  const clean = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')
  const name = `${Date.now()}-${clean}`
  const { error } = await supabase.storage.from(BUCKET)
    .upload(name, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  return publicUrl(name)
}

/* ---------------- notices ---------------- */
export async function listNotices() {
  const { data } = await supabase.from('notices')
    .select('*').order('pinned', { ascending: false })
    .order('published_at', { ascending: false })
  return data || []
}
export const addNotice = () =>
  supabase.from('notices')
    .insert({ tag: 'THE ROOM', title: 'New notice', body: '' })
    .select().single()
export const setNotice = (id, patch) =>
  supabase.from('notices').update(patch).eq('id', id)
export const deleteNotice = id =>
  supabase.from('notices').delete().eq('id', id)
