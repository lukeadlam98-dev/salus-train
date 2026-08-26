// Every Supabase query in one place, so screens stay about layout.

import { supabase } from './supabase'
import { LEGS, DEFAULT_MULTIPLIER } from './half'

/* ---------------- profile ---------------- */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function updateProfile(userId, patch) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (error) throw error
}

/* ---------------- config ---------------- */
export async function getMultiplier() {
  const { data } = await supabase
    .from('config').select('value').eq('key', 'half_multiplier').single()
  return data ? Number(data.value) : DEFAULT_MULTIPLIER
}

/* ---------------- benchmarks ---------------- */
export async function getBenchmarks(userId, week = 1) {
  const { data, error } = await supabase
    .from('benchmarks').select('*').eq('user_id', userId).eq('week', week)
  if (error) throw error
  const out = {}
  ;(data || []).forEach(r => { out[r.key] = r })
  return out
}

export async function saveBenchmark(userId, key, { num, secs, week = 1 }) {
  const { data, error } = await supabase.from('benchmarks').upsert({
    user_id: userId, key, week,
    value_num: num ?? null, value_s: secs ?? null,
  }, { onConflict: 'user_id,key,week' }).select().single()
  if (error) throw error
  return data
}

/* ---------------- programme content ---------------- */

// Which programme this member is on. Falls back to the first live one
// so a member with nothing assigned still sees something.
export async function getMyProgramme() {
  const { data } = await supabase.from('my_programme').select('*').maybeSingle()
  if (data) return data
  const { data: fallback } = await supabase
    .from('programmes').select('*').eq('live', true).eq('archived', false)
    .order('sort').limit(1).maybeSingle()
  return fallback
    ? { programme_id: fallback.id, slug: fallback.slug, name: fallback.name,
        total_weeks: fallback.weeks, race_name: fallback.race_name,
        uses_half: fallback.uses_half }
    : null
}

// A week of whichever programme they're on. Only published weeks come
// back for members — the RLS policy sees to that.
export async function getWeek(idx = 1, programmeId = null) {
  let pid = programmeId
  if (!pid) {
    const prog = await getMyProgramme()
    pid = prog?.programme_id
  }
  if (!pid) return null
  const { data, error } = await supabase
    .from('weeks').select('*, programmes!inner(*)')
    .eq('idx', idx).eq('programme_id', pid).maybeSingle()
  if (error) throw error
  return data
}

// Every published week, so the Plan tab knows what exists.
export async function getPublishedWeeks(programmeId) {
  const { data } = await supabase
    .from('weeks').select('idx, phase, note')
    .eq('programme_id', programmeId).order('idx')
  return data || []
}

export const setMyProgramme = (userId, programmeId) =>
  supabase.from('profiles').update({ programme_id: programmeId }).eq('id', userId)

export async function getSessions(weekId) {
  const { data, error } = await supabase
    .from('sessions').select('*').eq('week_id', weekId).order('day')
  if (error) throw error
  return data || []
}

export async function getSessionDetail(sessionId) {
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

export async function getProgrammes() {
  const { data } = await supabase.from('programmes')
    .select('*').eq('archived', false).order('sort')
  return data || []
}

/* ---------------- workout logging ---------------- */
export async function startWorkout(userId, sessionId) {
  const { data, error } = await supabase.from('workout_logs')
    .insert({ user_id: userId, session_id: sessionId }).select().single()
  if (error) throw error
  return data
}

export async function saveSet(workoutLogId, blockItemId, setIdx, patch) {
  const { data, error } = await supabase.from('set_logs').upsert({
    workout_log_id: workoutLogId, block_item_id: blockItemId,
    set_idx: setIdx, ...patch,
  }, { onConflict: 'workout_log_id,block_item_id,set_idx' }).select().single()
  if (error) throw error
  return data
}

export async function getSets(workoutLogId) {
  const { data } = await supabase.from('set_logs')
    .select('*').eq('workout_log_id', workoutLogId)
  const out = {}
  ;(data || []).forEach(r => { out[`${r.block_item_id}.${r.set_idx}`] = r })
  return out
}

export async function finishWorkout(workoutLogId, { elapsed_s, effort }) {
  const { error } = await supabase.from('workout_logs')
    .update({ ended_at: new Date().toISOString(), elapsed_s, effort })
    .eq('id', workoutLogId)
  if (error) throw error
}

/* ---------------- the half ---------------- */
export async function getHalf(userId, weekIdx = 1) {
  const { data } = await supabase.from('half_sims')
    .select('*, half_splits(*)').eq('user_id', userId).eq('week_idx', weekIdx).maybeSingle()
  if (!data) return { sim: null, splits: {} }
  const splits = {}
  ;(data.half_splits || []).forEach(r => { splits[r.leg_key] = r.seconds })
  return { sim: data, splits }
}

export async function saveHalfSplit(userId, weekIdx, legKey, seconds, multiplier) {
  // ensure the parent row exists
  let { data: sim } = await supabase.from('half_sims')
    .select('*').eq('user_id', userId).eq('week_idx', weekIdx).maybeSingle()
  if (!sim) {
    const { data, error } = await supabase.from('half_sims')
      .insert({ user_id: userId, week_idx: weekIdx }).select().single()
    if (error) throw error
    sim = data
  }

  const { error: e1 } = await supabase.from('half_splits').upsert({
    half_sim_id: sim.id, leg_key: legKey, seconds,
  }, { onConflict: 'half_sim_id,leg_key' })
  if (e1) throw e1

  // recompute the total and projection
  const { data: all } = await supabase.from('half_splits')
    .select('leg_key, seconds').eq('half_sim_id', sim.id)
  const total = (all || []).reduce((a, b) => a + b.seconds, 0)
  const complete = (all || []).length === LEGS.length
  const projected = complete ? Math.round(total * multiplier) : null

  await supabase.from('half_sims')
    .update({ total_s: total, projected_s: projected }).eq('id', sim.id)

  return { total, projected, complete }
}

/* ---------------- coaches and messages ---------------- */
export async function getCoaches() {
  const { data } = await supabase.from('coaches').select('*').order('sort')
  return data || []
}

export async function getMessages(userId) {
  const { data } = await supabase.from('messages')
    .select('*').eq('member_id', userId).order('created_at')
  const out = {}
  ;(data || []).forEach(m => {
    out[m.coach_id] = out[m.coach_id] || []
    out[m.coach_id].push(m)
  })
  return out
}

export async function sendMessage(userId, coachId, body) {
  const { data, error } = await supabase.from('messages')
    .insert({ member_id: userId, coach_id: coachId, from_member: true, body })
    .select().single()
  if (error) throw error
  return data
}

/* ---------------- notices and board ---------------- */
export async function getNotices() {
  const { data } = await supabase.from('notices')
    .select('*').order('pinned', { ascending: false })
    .order('published_at', { ascending: false })
  return data || []
}

export async function getLeaderboard() {
  const { data } = await supabase.from('leaderboard_half')
    .select('*').order('projected_s')
  return data || []
}

/* ---------------- boards ---------------- */
// Which boards to show, in the order the back office put them.
export async function getBoards() {
  const { data } = await supabase
    .from('leaderboards').select('*').eq('visible', true).order('ord')
  return data || []
}

// One board's standings. Sharing is opt-in, enforced by the view.
export async function getBoardRows(board) {
  if (board.source === 'score') {
    const { data } = await supabase.from('leaderboard_score')
      .select('*').not('score', 'is', null).order('score', { ascending: false })
    return (data || []).map(r => ({ name: r.name, v: r.score, sub: `${r.tests}/5` }))
  }
  if (board.source === 'half') {
    const { data } = await supabase.from('leaderboard_half')
      .select('*').order('projected_s')
    return (data || []).map(r => ({ name: r.name, v: r.projected_s }))
  }
  const { data } = await supabase.from('leaderboard_benchmarks')
    .select('*').eq('board_key', board.source)
  const rows = (data || [])
    .map(r => ({ name: r.name, v: r.value_s ?? r.value_num }))
    .filter(r => r.v != null)
  rows.sort((a, b) => board.lower_wins ? a.v - b.v : b.v - a.v)
  return rows
}

/* ---------------- home layout ---------------- */
// The Today screen's sections, in the order the back office put them.
export async function getHomeSections() {
  const { data } = await supabase
    .from('home_sections').select('*').eq('visible', true).order('ord')
  return data || []
}

export async function getConfig() {
  const { data } = await supabase.from('config').select('*')
  const out = {}
  ;(data || []).forEach(r => { out[r.key] = r.value })
  return out
}

/* ---------------- the Salus Score ---------------- */
// Five tests, each scored 0-100 against a fixed standard, averaged.
export async function getMyScore(userId) {
  const { data, error } = await supabase.rpc('salus_score', { p_user: userId })
  if (error) throw error
  const rows = data || []
  const overall = rows.length
    ? Math.round(rows.reduce((a, b) => a + Number(b.score), 0) / rows.length)
    : null
  return { rows, overall, tests: rows.length }
}

export async function getScoreBoard() {
  const { data } = await supabase.from('leaderboard_score')
    .select('*').not('score', 'is', null).order('score', { ascending: false })
  return data || []
}
