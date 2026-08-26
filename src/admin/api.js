// Every admin query in one place.
import { supabase } from '../lib/supabase'

/* ---------------- weeks ---------------- */
export async function listWeeks(programmeId) {
  const { data, error } = await supabase
    .from('weeks').select('*, programmes!inner(id,slug,name)')
    .eq('programme_id', programmeId).order('idx')
  if (error) throw error
  return data || []
}

// Copy a week — same programme, or across to another one.
export async function duplicateWeek(srcWeekId, destProgrammeId, destIdx = null) {
  const { data, error } = await supabase.rpc('duplicate_week_to', {
    src_week: srcWeekId, dest_prog: destProgrammeId, dest_idx: destIdx,
  })
  if (error) throw error
  return data
}

export async function addWeek(programmeId, idx = null) {
  const { data, error } = await supabase.rpc('add_week', {
    p_programme: programmeId, p_idx: idx,
  })
  if (error) throw error
  return data
}

export async function createProgramme(name, weeks = 8, blurb = null) {
  const slug = name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const { data, error } = await supabase.rpc('create_programme', {
    p_name: name, p_slug: slug, p_weeks: weeks, p_blurb: blurb,
  })
  if (error) throw error
  return data
}

export const setWeek = (id, patch) =>
  supabase.from('weeks').update(patch).eq('id', id)
export const deleteWeek = id =>
  supabase.from('weeks').delete().eq('id', id)

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
export const deleteSession = id =>
  supabase.from('sessions').delete().eq('id', id)

export async function addSession(weekId, day) {
  const { data, error } = await supabase.from('sessions').insert({
    week_id: weekId, day, title: 'New session', kind: 'strength',
  }).select().single()
  if (error) throw error
  return data
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
  const letters = ['W', 'A', 'B', 'C', 'D', 'E', 'F']
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

/* Reordering writes the whole list's ord values, so there are never
   two rows claiming the same position. */
export async function reorder(table, ids) {
  await Promise.all(ids.map((id, i) =>
    supabase.from(table).update({ ord: i + 1 }).eq('id', id)))
}

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
export const deleteMovement = id =>
  supabase.from('movements').delete().eq('id', id)

/* ---------------- images ---------------- */
const BUCKET = 'Photos'

export async function listImages(kind = 'image') {
  const { data, error } = await supabase.storage.from(BUCKET)
    .list('', { limit: 300, sortBy: { column: 'created_at', order: 'desc' } })
  if (error) throw error
  const pattern = kind === 'video'
    ? /\.(mp4|webm|mov)$/i
    : /\.(jpe?g|png|webp|avif)$/i
  return (data || [])
    .filter(f => pattern.test(f.name))
    .map(f => ({ ...f, url: publicUrl(f.name) }))
}

export const publicUrl = name =>
  supabase.storage.from(BUCKET).getPublicUrl(name).data.publicUrl

export async function uploadImage(file) {
  // Unique name, so re-uploading never silently replaces a photo
  // another session is already pointing at.
  const clean = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')
  const name = `${Date.now()}-${clean}`
  const { error } = await supabase.storage.from(BUCKET)
    .upload(name, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  return publicUrl(name)
}

export const deleteImage = name =>
  supabase.storage.from(BUCKET).remove([name])

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
export async function setNotice(id, patch) {
  const { error } = await supabase.from('notices').update(patch).eq('id', id)
  if (error) throw error
}
export const deleteNotice = id =>
  supabase.from('notices').delete().eq('id', id)

/* ---------------- members ---------------- */
export async function listMembers() {
  const { data, error } = await supabase
    .from('member_overview').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// Everything about one member, for the detail view.
export async function getMember(id) {
  const [profile, benchmarks, half, splits, workouts] = await Promise.all([
    supabase.from('member_overview').select('*').eq('id', id).single(),
    supabase.from('benchmarks').select('*').eq('user_id', id).order('week'),
    supabase.from('half_sims').select('*').eq('user_id', id).order('week_idx'),
    supabase.from('half_splits').select('*, half_sims!inner(user_id,week_idx)')
      .eq('half_sims.user_id', id),
    supabase.from('workout_logs')
      .select('*, sessions(title, day, weeks(idx))')
      .eq('user_id', id).order('started_at', { ascending: false }).limit(30),
  ])
  return {
    profile: profile.data,
    benchmarks: benchmarks.data || [],
    halves: half.data || [],
    splits: splits.data || [],
    workouts: workouts.data || [],
  }
}

// Where the cohort is weakest, station by station.
export async function getStationAverages() {
  const { data } = await supabase.from('station_averages').select('*')
  return data || []
}

/* ---------------- home layout ---------------- */
export async function listSections() {
  const { data, error } = await supabase
    .from('home_sections').select('*').order('ord')
  if (error) throw error
  return data || []
}
export async function setSection(id, patch) {
  const { error } = await supabase.from('home_sections').update(patch).eq('id', id)
  if (error) throw error
}

export async function reorderSections(ids) {
  await Promise.all(ids.map((id, i) =>
    supabase.from('home_sections').update({ ord: i + 1 }).eq('id', id)))
}

/* ---------------- programmes ---------------- */
export async function listProgrammes() {
  const { data } = await supabase.from('programmes').select('*').order('sort')
  return data || []
}
export async function setProgramme(id, patch) {
  const { error } = await supabase.from('programmes').update(patch).eq('id', id)
  if (error) throw error
}
export const addProgramme = () =>
  supabase.from('programmes').insert({
    slug: `programme-${Date.now()}`, name: 'New programme', weeks: 8, live: false,
    sort: 99,
  }).select().single()
export const deleteProgramme = id =>
  supabase.from('programmes').delete().eq('id', id)
export async function reorderProgrammes(ids) {
  await Promise.all(ids.map((id, i) =>
    supabase.from('programmes').update({ sort: i + 1 }).eq('id', id)))
}

/* ---------------- settings ---------------- */
export async function getConfig() {
  const { data } = await supabase.from('config').select('*')
  const out = {}
  ;(data || []).forEach(r => { out[r.key] = r.value })
  return out
}
export async function setConfig(key, value) {
  const { error } = await supabase.from('config')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) throw error
}

/* ---------------- leaderboards ---------------- */
export async function listBoards() {
  const { data, error } = await supabase
    .from('leaderboards').select('*').order('ord')
  if (error) throw error
  return data || []
}
export async function setBoard(id, patch) {
  const { error } = await supabase.from('leaderboards').update(patch).eq('id', id)
  if (error) throw error
}
export const deleteBoard = id =>
  supabase.from('leaderboards').delete().eq('id', id)
export async function reorderBoards(ids) {
  await Promise.all(ids.map((id, i) =>
    supabase.from('leaderboards').update({ ord: i + 1 }).eq('id', id)))
}

// Everyone, sharing or not — so you can see who is missing and why.
export async function getBoardAdmin() {
  const { data, error } = await supabase.from('leaderboard_admin').select('*')
  if (error) throw error
  return data || []
}

// One board's actual standings, as members see them.
export async function getBoardRows(board) {
  if (board.source === 'half') {
    const { data } = await supabase.from('leaderboard_half')
      .select('*').order('projected_s')
    return (data || []).map(r => ({ name: r.name, v: r.projected_s }))
  }
  const { data } = await supabase.from('leaderboard_benchmarks')
    .select('*').eq('board_key', board.source)
  const rows = (data || []).map(r => ({
    name: r.name, v: r.value_s ?? r.value_num,
  })).filter(r => r.v != null)
  rows.sort((a, b) => board.lower_wins ? a.v - b.v : b.v - a.v)
  return rows
}
