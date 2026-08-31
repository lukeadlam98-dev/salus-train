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
        uses_half: fallback.uses_half, race_image: fallback.race_image,
        race_location: fallback.race_location, race_date: fallback.race_date }
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

// A member's week, with any moves they've made applied. Falls back to
// the coach's order if the function isn't there yet.
export async function getSessions(weekId) {
  const { data, error } = await supabase.rpc('my_week', { p_week: weekId })
  if (!error) return data || []

  const { data: plain, error: e2 } = await supabase
    .from('sessions').select('*').eq('week_id', weekId).order('day')
  if (e2) throw e2
  return (plain || []).map(s => ({ ...s, coach_day: s.day, moved: false }))
}

export async function rearrangeWeek(weekId, order) {
  const { error } = await supabase.rpc('rearrange_week', {
    p_week: weekId,
    p_session: order.map(o => o.id),
    p_day: order.map(o => o.day),
  })
  if (error) throw error
}

export async function resetWeek(weekId) {
  const { error } = await supabase.rpc('reset_week', { p_week: weekId })
  if (error) throw error
}

// The blocks of every session in a week, so the Today card can show
// the shape of the session rather than just its name.
export async function getWeekOutline(sessionIds) {
  if (!sessionIds?.length) return {}
  const { data } = await supabase
    .from('blocks')
    .select('id, session_id, ord, letter, label, scheme, block_lines(movement, ord)')
    .in('session_id', sessionIds).order('ord')
  const out = {}
  ;(data || []).forEach(b => {
    out[b.session_id] = out[b.session_id] || []
    out[b.session_id].push({
      ...b,
      movements: (b.block_lines || [])
        .sort((a, c) => a.ord - c.ord)
        .map(l => l.movement).filter(Boolean),
    })
  })
  return out
}

export async function getCompletions(sessionIds) {
  if (!sessionIds?.length) return {}
  const { data } = await supabase.from('session_completions')
    .select('*').in('session_id', sessionIds)
  const out = {}
  ;(data || []).forEach(r => { out[r.session_id] = r })
  return out
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
  // The Salus Leaderboard: a placing in each of the five tests, summed.
  if (board.source === 'salus') {
    const { data } = await supabase.from('salus_leaderboard')
      .select('*').order('place')
    return (data || []).map(r => ({
      name: r.name, v: r.points, position: r.place,
      sub: r.tests_done < 5 ? `${r.tests_done}/5 tested` : null,
      ranks: [r.r_squat, r.r_fivek, r.r_ski, r.r_row, r.r_half],
      tests_done: r.tests_done,
    }))
  }
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

// The member's own row, with their five placings broken out.
export async function getMyLeaderboardRow(userId) {
  const { data, error } = await supabase
    .rpc('my_leaderboard_row', { p_user: userId })
  if (error) throw error
  return data?.[0] || null
}

/* ---------------- progress ---------------- */
export async function getActivity(userId, since = null) {
  const { data, error } = await supabase.rpc('my_activity', {
    p_user: userId, p_since: since,
  })
  if (error) throw error
  return data?.[0] || { sessions: 0, minutes: 0, volume: 0, sets: 0 }
}

export async function getMovements(userId) {
  const { data, error } = await supabase.rpc('my_movements', { p_user: userId })
  if (error) throw error
  return data || []
}

/* ---------------- community ---------------- */
export async function getFeed(limit = 25) {
  const { data } = await supabase.from('community_feed')
    .select('*').limit(limit)
  return data || []
}

export async function getClubWeek() {
  const { data } = await supabase.rpc('club_week')
  return data?.[0] || { sessions: 0, people: 0, minutes: 0 }
}

export async function getSessionCompany(sessionId) {
  const { data } = await supabase.rpc('session_company', { p_session: sessionId })
  return data || []
}

/* ---------------- running ---------------- */

// Target paces as a fraction of their own tested 5km, so "steady"
// means the same effort to everyone rather than the same number.
export async function getPaces(userId) {
  const { data, error } = await supabase.rpc('my_paces', { p_user: userId })
  if (error) throw error
  // The function returns the multiplier; the seconds come from their 5km.
  return data || []
}

export async function saveRun(userId, run, splits = []) {
  const { data, error } = await supabase.from('run_logs')
    .insert({ user_id: userId, ...run }).select().single()
  if (error) throw error
  if (splits.length) {
    const rows = splits.map((s, i) => ({ run_log_id: data.id, idx: i + 1, ...s }))
    const { error: e2 } = await supabase.from('run_splits').insert(rows)
    if (e2) throw e2
  }
  return data
}

export async function getRuns(userId, limit = 20) {
  const { data } = await supabase.from('run_logs')
    .select('*').eq('user_id', userId)
    .order('ran_at', { ascending: false }).limit(limit)
  return data || []
}

/* ---------------- posts ---------------- */
export async function getPosts(limit = 30) {
  const { data } = await supabase.from('post_feed').select('*').limit(limit)
  return data || []
}

export async function addPost(userId, post) {
  const { data, error } = await supabase.from('posts')
    .insert({ user_id: userId, ...post }).select().single()
  if (error) throw error
  return data
}

export const deletePost = id => supabase.from('posts').delete().eq('id', id)

export async function toggleKudos(postId, userId, on) {
  if (on) {
    const { error } = await supabase.from('kudos')
      .insert({ post_id: postId, user_id: userId })
    if (error && error.code !== '23505') throw error
  } else {
    const { error } = await supabase.from('kudos')
      .delete().eq('post_id', postId).eq('user_id', userId)
    if (error) throw error
  }
}

/* ---------------- prediction ---------------- */
// What they're on for, before they've run a half.
export async function getPrediction(userId) {
  const { data, error } = await supabase.rpc('predict_finish', { p_user: userId })
  if (error) throw error
  return data?.[0] || null
}

// How many of this week's sessions a member has finished.
export async function getWeekDone(userId, sessionIds) {
  if (!sessionIds?.length) return 0
  const { data } = await supabase.from('workout_logs')
    .select('session_id').eq('user_id', userId)
    .not('ended_at', 'is', null).in('session_id', sessionIds)
  return new Set((data || []).map(r => r.session_id)).size
}

/* ---------------- navigation ---------------- */
// The tab labels come from the database so the back office isn't
// describing something it can't change. The keys never do — those are
// what the app routes on.
export async function getTabs() {
  const { data, error } = await supabase
    .from('app_tabs').select('*').eq('visible', true).order('ord')
  if (error) return null          // fall back to the built-in four
  return data?.length ? data : null
}

export async function getCommunitySections() {
  const { data } = await supabase
    .from('community_sections').select('*').eq('visible', true).order('ord')
  return data || []
}

/* ---------------- races ---------------- */
export async function getRaces() {
  const { data, error } = await supabase.from('my_races').select('*')
  if (error) return []
  return data || []
}

export async function addRace(userId, race) {
  const { data, error } = await supabase.from('races')
    .insert({ user_id: userId, ...race }).select().single()
  if (error) throw error
  return data
}

export const updateRace = async (id, patch) => {
  const { error } = await supabase.from('races').update(patch).eq('id', id)
  if (error) throw error
}

export const deleteRace = id => supabase.from('races').delete().eq('id', id)

export async function setTargetRace(id) {
  const { error } = await supabase.rpc('set_target_race', { p_race: id })
  if (error) throw error
}

/* ---------------- the race catalogue ---------------- */
// Real fixtures, so members pick rather than type. Five spellings of
// "HYROX London" and one wrong date is what typing gets you.
export async function getRaceCatalog({ series, region } = {}) {
  let q = supabase.from('upcoming_races').select('*')
  if (series) q = q.eq('series', series)
  if (region) q = q.eq('region', region)
  const { data, error } = await q
  if (error) return []
  return data || []
}

/* ---------------- club chat ---------------- */
export async function getChat(limit = 60) {
  const { data, error } = await supabase.from('chat_feed')
    .select('*').order('created_at', { ascending: false }).limit(limit)
  if (error) return []
  return (data || []).reverse()          // oldest first, like a chat
}

// Named apart from sendMessage, which is the coach DM. Two things
// called the same is how you end up sending a private question to
// the whole room.
export async function postToRoom(userId, body, photo_url = null) {
  const { data, error } = await supabase.from('chat_messages')
    .insert({ user_id: userId, body, photo_url }).select().single()
  if (error) throw error
  return data
}

export const removeMessage = id =>
  supabase.from('chat_messages').update({ deleted: true }).eq('id', id)

// A message arriving while someone is looking at the room.
export function onNewMessage(fn) {
  const ch = supabase.channel('club-chat')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      () => fn())
    .subscribe()
  return () => supabase.removeChannel(ch)
}

// What this block asks of this member — a weight from their tested max,
// a pace from their 5km, or an RPE. Null when there's nothing to work
// from, because a made-up target is worse than none.
export async function getBlockTarget(userId, blockId) {
  const { data, error } = await supabase.rpc('block_target',
    { p_user: userId, p_block: blockId })
  if (error) return null
  return data?.[0] || null
}
