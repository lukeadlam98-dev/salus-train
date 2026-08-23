// Brand photography lives in the Supabase `photos` bucket.
//
// Content photos (a session, a programme) belong on the row —
// see sessions.cover_url. These are the fixed brand shots that
// aren't tied to any particular content, so they sit here.
//
// Set BASE to your bucket URL. Storage → photos → any file →
// Copy URL, then trim everything after /public/photos/.

const BASE = import.meta.env.VITE_SUPABASE_URL +
  '/storage/v1/object/public/Photos'

export const PHOTOS = {
  hero:     `${BASE}/hero.jpg`,      // treadmill runners — the splash
  squat:    `${BASE}/squat.jpg`,     // barbell, B&W
  reformer: `${BASE}/reformer.jpg`,  // the studio
  plate:    `${BASE}/plate.jpg`,     // plate, B&W
}

// Splash video. Keep it under ~1.5MB, no audio track, 4-6 seconds,
// looping cleanly. PHOTOS.hero sits underneath as the poster frame,
// so a slow connection never sees black.
// Leave VIDEO.splash as null to fall back to the photo alone.
export const VIDEO = {
  splash: `${BASE}/splash.mp4`,
}

// The Salus mark. Export it LIGHT (cream on transparent) — the light
// theme inverts it with a CSS filter, so one file covers both themes.
// Around 400px square is plenty; it never renders larger than ~70px.
export const LOGO = `${BASE}/mark.png`
