// Brand assets live in the Supabase Storage bucket.
//
// NOTE the capital P — Storage paths are case-sensitive, and the bucket
// on this project is called "Photos". Getting this wrong 404s every
// image and video at once with no error message anywhere obvious.
const BUCKET = 'Photos'

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`

export const PHOTOS = {
  hero:     `${BASE}/hero.jpg`,      // the splash
  squat:    `${BASE}/squat.jpg`,
  reformer: `${BASE}/reformer.jpg`,
  plate:    `${BASE}/plate.jpg`,
}

// Splash video. Under ~1.5MB, no audio track, 4-6 seconds, looping
// cleanly. PHOTOS.hero sits underneath as the poster frame, so a slow
// connection never sees black. Set to null to fall back to the photo.
export const VIDEO = {
  splash: `${BASE}/splash.mp4`,
}

// The Salus mark. Export it LIGHT (cream on transparent) — the light
// theme inverts it with a CSS filter, so one file covers both themes.
export const LOGO = `${BASE}/mark.png`


// ---------------------------------------------------------------
// The splash media is set in the back office. These are the
// fallbacks — used when nothing has been chosen, or before the
// config has loaded.
// ---------------------------------------------------------------
export const MEDIA_DEFAULTS = {
  splash_video:  VIDEO.splash,
  splash_poster: PHOTOS.hero,
  logo_url:      LOGO,
}

// Config values arrive as strings and an empty one means "not set",
// which is not the same as "off" — so fall back rather than blanking.
export const pickMedia = (cfg, key) => {
  const v = cfg?.[key]
  return v && v.trim() ? v.trim() : MEDIA_DEFAULTS[key]
}
