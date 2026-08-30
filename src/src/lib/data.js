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
export async function getWeek(idx = 1, slug = 'road-to-hyrox') {
  const { data, error } = await supabase
    .from('weeks').select('*, programmes!inner(*)')
    .eq('idx', idx).eq('programmes.slug', slug).single()
  if (error) throw error
  return data
}

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
  const { data } = await supabase.from('programmes').select('*').order('sort')
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
