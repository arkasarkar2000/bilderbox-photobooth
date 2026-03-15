/* ─────────────────────────────────────────
   Bilderbox — app.js  v7
   Full-screen viewfinder UX
───────────────────────────────────────── */

/* ── Error boundary ── */
window.addEventListener('error', e => {
  if (!e.filename || e.filename.includes('cdn.')) return
  const el = document.getElementById('error-boundary')
  const msg = document.getElementById('error-boundary-msg')
  if (el) { el.style.display = 'flex'; if (msg) msg.textContent = `${e.message} (${e.filename?.split('/').pop()}:${e.lineno})` }
})
window.addEventListener('unhandledrejection', e => {
  const m = e.reason?.message || String(e.reason) || ''
  if (m.toLowerCase().includes('abort') || m.toLowerCase().includes('cancel')) return
  const el = document.getElementById('error-boundary')
  const msg = document.getElementById('error-boundary-msg')
  if (el) { el.style.display = 'flex'; if (msg) msg.textContent = m }
})

/* ── PWA ── */
let deferredInstall = null
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstall = e
  const btn = document.getElementById('pwa-install-btn'); if (btn) btn.style.display = 'inline-flex'
})
function installPWA() {
  if (!deferredInstall) return
  deferredInstall.prompt()
  deferredInstall.userChoice.then(() => { deferredInstall = null; const b = document.getElementById('pwa-install-btn'); if (b) b.style.display = 'none' })
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(() => {}))
}
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
if (isIOS && !window.navigator.standalone) { const h = document.getElementById('ios-hint'); if (h) h.style.display = 'inline-flex' }

/* ── Theme ── */
function toggleTheme() {
  const isLight = document.documentElement.classList.toggle('light-mode')
  try { localStorage.setItem('bb-theme', isLight ? 'light' : 'dark') } catch {}
  document.getElementById('theme-icon-dark').style.display  = isLight ? 'none'  : 'block'
  document.getElementById('theme-icon-light').style.display = isLight ? 'block' : 'none'
}
;(function() {
  try {
    if (localStorage.getItem('bb-theme') === 'light') {
      document.documentElement.classList.add('light-mode')
      const d = document.getElementById('theme-icon-dark'); const l = document.getElementById('theme-icon-light')
      if (d) d.style.display = 'none'; if (l) l.style.display = 'block'
    }
  } catch {}
})()

/* ── Screen navigation ── */
const SCREENS = ['screen-viewfinder','screen-customize','screen-generating','screen-result']

function showScreen(id) {
  SCREENS.forEach(sid => {
    const el = document.getElementById(sid)
    if (!el) return
    el.classList.remove('screen-active','screen-behind')
  })
  /* mark all others as behind (hidden left), active screen on top */
  const activeIdx = SCREENS.indexOf(id)
  SCREENS.forEach((sid, i) => {
    const el = document.getElementById(sid)
    if (!el) return
    if (sid === id) {
      el.classList.add('screen-active')
    } else if (i < activeIdx) {
      el.classList.add('screen-behind')
    }
    /* screens after active stay off-screen-right (default transform) */
  })
}

function goToViewfinder() { showScreen('screen-viewfinder') }
function goToCustomize()  { buildCustPreview(); showScreen('screen-customize') }

/* ── Constants ── */
const LAYOUT_CAPS = { strip4: 4, grid2x2: 6, filmreel: 8, polaroid: 6 }

const FILTERS = {
  none:       { css: '', label: '' },
  bw:         { css: 'grayscale(100%)', label: 'B&W' },
  sepia:      { css: 'sepia(80%)', label: 'Sepia' },
  vivid:      { css: 'contrast(1.3) saturate(1.5)', label: 'Vivid' },
  fade:       { css: 'brightness(1.1) contrast(0.82) saturate(0.65)', label: 'Fade' },
  noir:       { css: 'contrast(1.5) brightness(0.82) grayscale(30%)', label: 'Noir' },
  warm:       { css: 'saturate(1.8) hue-rotate(-18deg)', label: 'Warm' },
  disposable: { css: 'contrast(1.15) saturate(1.25) sepia(20%) brightness(1.08)', label: 'Disposable' },
  kodak:      { css: 'sepia(35%) contrast(1.1) saturate(1.3) hue-rotate(5deg)', label: 'Kodak' },
  fujifilm:   { css: 'saturate(1.4) hue-rotate(8deg) contrast(1.05) brightness(1.04)', label: 'Fujifilm' },
  y2k:        { css: 'contrast(1.2) saturate(0.9) brightness(1.15) blur(0.4px)', label: 'Y2K Cam' },
}

const FRAMES = [
  { id: 'none',           label: 'None',     bg: '#0e0b10' },
  { id: 'frame-classic',  label: 'Classic',  bg: '#f5f0e8' },
  { id: 'frame-dark',     label: 'Dark',     bg: '#111' },
  { id: 'frame-gold',     label: 'Gold',     bg: '#2a1f06' },
  { id: 'frame-pink',     label: 'Pink',     bg: '#fce8f1' },
  { id: 'frame-polaroid', label: 'Polaroid', bg: '#faf8f2' },
  { id: 'frame-film',     label: 'Film',     bg: '#111' },
]

const FRAME_THUMBS = {
  none:           `<div style="width:100%;height:100%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:0.55rem;color:var(--text3);font-family:'DM Mono',monospace;letter-spacing:0.04em">NONE</div>`,
  'frame-classic':`<div style="width:100%;height:100%;border:5px solid #f5f0e8;box-shadow:inset 0 0 0 1px #d4c9a8;background:var(--bg3)"></div>`,
  'frame-dark':   `<div style="width:100%;height:100%;border:5px solid #111;background:var(--bg3)"></div>`,
  'frame-gold':   `<div style="width:100%;height:100%;border:5px solid #d4a853;background:var(--bg3)"></div>`,
  'frame-pink':   `<div style="width:100%;height:100%;border:5px solid #f4a7c0;background:var(--bg3)"></div>`,
  'frame-polaroid':`<div style="width:100%;height:100%;border:4px solid #faf8f2;border-bottom:14px solid #faf8f2;background:var(--bg3)"></div>`,
  'frame-film':   `<div style="width:100%;height:100%;box-shadow:inset 5px 0 0 #111,inset -5px 0 0 #111;background:var(--bg3)"></div>`,
}

const LAYOUTS = [
  { id: 'strip4',   label: 'Strip',    cap: 4 },
  { id: 'grid2x2',  label: '2×2',      cap: 6 },
  { id: 'filmreel', label: 'Reel',     cap: 8 },
  { id: 'polaroid', label: 'Polaroid', cap: 6 },
]

const MOOD_FILTERS = { happy: 'vivid', dreamy: 'fade', moody: 'noir', retro: 'kodak', y2k: 'y2k' }

/* ── State ── */
let currentFilter    = 'none'
let currentFrame     = 'none'
let currentLayout    = 'strip4'
let currentBg        = '#0e0b10'
let withTimestamp    = false
let timerSecs        = 0
let photos           = []
let capturing        = false
let stream           = null
let stillImage       = null
let resultDataUrl    = null
let currentModalIdx  = null

/* ── DOM refs ── */
const video       = document.getElementById('video')
const previewCvs  = document.getElementById('canvas-preview')
const previewCtx  = previewCvs.getContext('2d')
const countdownEl = document.getElementById('countdown')
const flashEl     = document.getElementById('flash')
const stripCvs    = document.getElementById('strip-canvas')
const stripCtx    = stripCvs.getContext('2d')
const captureBtn  = document.getElementById('capture-btn')
const burstBtn    = document.getElementById('burst-btn')
const filterLabel = document.getElementById('live-filter-label')
const cameraWrap  = document.getElementById('camera-wrap')

/* ── Build layout buttons in viewfinder HUD ── */
function buildLayoutBar() {
  const row = document.getElementById('vf-layout-row'); if (!row) return
  row.innerHTML = ''
  LAYOUTS.forEach(l => {
    const btn = document.createElement('button')
    btn.className = 'vf-layout-btn' + (l.id === currentLayout ? ' active' : '')
    btn.dataset.id = l.id
    btn.textContent = l.label
    btn.addEventListener('click', () => setLayout(l.id))
    row.appendChild(btn)
  })
}
buildLayoutBar()

/* ── Build frame grid in customize screen ── */
function buildFrameGrid() {
  const grid = document.getElementById('frames-grid'); if (!grid) return
  grid.innerHTML = ''
  FRAMES.forEach(f => {
    const btn = document.createElement('div')
    btn.className = 'cust-frame-btn' + (f.id === currentFrame ? ' active' : '')
    btn.dataset.id = f.id
    btn.innerHTML = `<div class="cust-frame-thumb">${FRAME_THUMBS[f.id] || ''}</div><div class="cust-frame-label">${f.label}</div>`
    btn.addEventListener('click', () => setFrame(f.id))
    grid.appendChild(btn)
  })
}
buildFrameGrid()

/* ── Layout ── */
function setLayout(id) {
  currentLayout = id
  document.querySelectorAll('.vf-layout-btn').forEach(b => b.classList.toggle('active', b.dataset.id === id))
  updateDots()
  updateCaptureState()
}

/* ── Filter ── */
function setFilter(id, btn) {
  currentFilter = id
  const f = FILTERS[id] || FILTERS.none
  /* only apply live filter to video if we're on the viewfinder screen */
  const onViewfinder = document.getElementById('screen-viewfinder')?.classList.contains('screen-active')
  if (onViewfinder && video) {
    video.style.filter = f.css || ''
    if (f.label) { filterLabel.textContent = f.label; filterLabel.classList.add('visible') }
    else { filterLabel.classList.remove('visible') }
  }
  document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b.dataset.filter === id))
  if (btn) btn.classList.add('active')
  if (stillImage) drawStillWithCurrentSettings()
  buildCustPreview()
}

/* ── Frame ── */
function setFrame(id) {
  currentFrame = id
  /* only update the live frame overlay when on viewfinder — not on customize screen */
  const onViewfinder = document.getElementById('screen-viewfinder')?.classList.contains('screen-active')
  if (onViewfinder) {
    const overlay = document.getElementById('frame-overlay')
    if (overlay) { overlay.className = 'frame-overlay'; if (id !== 'none') overlay.classList.add(id) }
    const frameDef = FRAMES.find(f => f.id === id)
    if (cameraWrap && frameDef) cameraWrap.style.background = frameDef.bg
  }
  document.querySelectorAll('.cust-frame-btn').forEach(b => b.classList.toggle('active', b.dataset.id === id))
  if (stillImage) drawStillWithCurrentSettings()
  buildCustPreview()
}

/* ── Background ── */
function setBg(color, btn) {
  currentBg = color
  document.querySelectorAll('.cust-bg-swatch').forEach(b => {
    b.classList.toggle('active', b.dataset.bg === color)
    b.style.border = b.dataset.bg === color ? '2px solid var(--pink)' : '2px solid transparent'
  })
  buildCustPreview()
}

/* ── Mood ── */
function setMood(id) {
  document.querySelectorAll('.cust-mood').forEach(m => m.classList.toggle('active', m.title === id))
  const filterId = MOOD_FILTERS[id] || 'none'
  const btn = document.querySelector(`[data-filter="${filterId}"]`)
  setFilter(filterId, btn)
}

/* ── Timer ── */
function setTimer(s, btn) {
  timerSecs = s
  document.querySelectorAll('.vf-timer-btn').forEach(b => b.classList.remove('active'))
  if (btn) btn.classList.add('active')
}

/* ── Timestamp toggle ── */
function toggleTimestamp() {
  withTimestamp = !withTimestamp
  const btn = document.getElementById('timestamp-toggle')
  if (btn) btn.setAttribute('aria-pressed', String(withTimestamp))
}

/* ── Update capture state ── */
function updateCaptureState() {
  const alive = photos.filter(p => p !== null).length
  const cap   = LAYOUT_CAPS[currentLayout]
  const full  = alive >= cap
  if (captureBtn) captureBtn.disabled = !stream || full
  if (burstBtn)   burstBtn.disabled   = !stream || full
  const up = document.getElementById('upload-btn'); if (up) up.disabled = full
  if (full) showToast(`${cap}/${cap} — clear some or switch layout`)
}

/* ── Update photo dots in HUD ── */
function updateDots() {
  const dotsEl = document.getElementById('vf-photo-dots'); if (!dotsEl) return
  const cap = LAYOUT_CAPS[currentLayout]
  const alive = photos.filter(p => p !== null)
  dotsEl.innerHTML = ''
  for (let i = 0; i < cap; i++) {
    const d = document.createElement('div')
    d.className = 'vf-dot' + (i < alive.length ? ' filled' : '')
    dotsEl.appendChild(d)
  }
}

/* ── Camera ── */
async function startCamera() {
  document.getElementById('camera-error').style.display = 'none'
  document.getElementById('startup').style.display = 'flex'

  if (!navigator.mediaDevices?.getUserMedia) { showCameraError('Camera API not supported. Use Chrome or Safari.'); return }
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') { showCameraError('Camera requires HTTPS.'); return }

  let s = null
  try {
    s = await navigator.mediaDevices.getUserMedia({ video: { width:{ideal:3840}, height:{ideal:2160}, facingMode:'user' }, audio: false })
  } catch (err) {
    if (['OverconstrainedError','NotReadableError','NotFoundError','AbortError'].includes(err.name)) {
      try { s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }) }
      catch (fe) { showCameraError(friendlyCameraError(fe)); return }
    } else { showCameraError(friendlyCameraError(err)); return }
  }
  stream = s
  video.srcObject = stream
  await new Promise(resolve => { video.onloadedmetadata = resolve; setTimeout(resolve, 3000) })
  document.getElementById('startup').style.display = 'none'
  updateCaptureState()
}

function friendlyCameraError(err) {
  switch (err.name) {
    case 'NotAllowedError': case 'PermissionDeniedError': return 'Camera access denied. Tap "How to fix this".'
    case 'NotFoundError':   case 'DevicesNotFoundError':  return 'No camera found on this device.'
    case 'NotReadableError': case 'TrackStartError':      return 'Camera in use by another app. Close it and retry.'
    default: return `Camera error: ${err.message || err.name}`
  }
}
function showCameraError(msg) {
  document.getElementById('startup').style.display = 'none'
  const e = document.getElementById('camera-error'); const m = document.getElementById('camera-error-msg')
  if (m) m.textContent = msg; if (e) e.style.display = 'flex'
}
async function retryCameraAccess() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
  video.srcObject = null
  document.getElementById('camera-error').style.display = 'none'
  document.getElementById('startup').style.display = 'flex'
  await startCamera()
}
function showCameraHelp() { document.getElementById('camera-help-modal').classList.add('open') }

/* ── Capture ── */
async function capturePhoto() {
  if (capturing || !stream) return
  if (photos.filter(p => p !== null).length >= LAYOUT_CAPS[currentLayout]) return
  capturing = true; if (captureBtn) captureBtn.disabled = true; if (burstBtn) burstBtn.disabled = true
  try {
    if (timerSecs > 0) await runCountdown(timerSecs)
    doFlash(); addPhoto(grabFrame()); await sleep(200)
  } catch (err) { showToast('Capture failed — try again'); console.error(err) }
  finally { capturing = false; updateCaptureState() }
}

async function startBurst() {
  if (capturing || !stream) return
  const cap = LAYOUT_CAPS[currentLayout]
  if (photos.filter(p => p !== null).length >= cap) return
  capturing = true; if (captureBtn) captureBtn.disabled = true; if (burstBtn) burstBtn.disabled = true
  try {
    const slots = Math.min(4, cap - photos.filter(p => p !== null).length)
    for (let i = 0; i < slots; i++) {
      if (timerSecs > 0) await runCountdown(timerSecs)
      doFlash(); addPhoto(grabFrame())
      if (i < slots - 1) await sleep(400)
    }
    await sleep(200)
  } catch (err) { showToast('Burst failed — try again'); console.error(err) }
  finally { capturing = false; updateCaptureState() }
}

async function runCountdown(secs) {
  countdownEl.style.opacity = '1'
  for (let i = secs; i >= 1; i--) { countdownEl.textContent = i; await sleep(1000) }
  countdownEl.style.opacity = '0'
}
function doFlash() { flashEl.classList.remove('active'); void flashEl.offsetWidth; flashEl.classList.add('active') }

function grabFrame() {
  const w = video.videoWidth || 1280; const h = video.videoHeight || 960
  previewCvs.width = w; previewCvs.height = h
  const f = FILTERS[currentFilter] || FILTERS.none
  previewCtx.filter = f.css || 'none'
  previewCtx.save(); previewCtx.scale(-1,1); previewCtx.drawImage(video,-w,0,w,h); previewCtx.restore()
  previewCtx.filter = 'none'
  return previewCvs.toDataURL('image/jpeg', 0.95)
}

/* ── Photo management ── */
function addPhoto(dataUrl) {
  const alive = photos.filter(p => p !== null).length
  if (alive >= LAYOUT_CAPS[currentLayout]) return
  const idx = photos.length
  photos.push({ dataUrl })
  updateDots()
  addThumb(dataUrl, idx)
  updateCaptureState()
}

function addThumb(dataUrl, idx) {
  const row = document.getElementById('vf-thumb-row')
  const bar = document.getElementById('vf-proceed-bar')
  if (!row) return
  const thumb = document.createElement('div')
  thumb.className = 'vf-thumb'; thumb.dataset.idx = idx
  const img = document.createElement('img'); img.src = dataUrl; img.alt = 'Photo ' + (idx+1)
  const del = document.createElement('button'); del.className = 'vf-thumb-del'; del.textContent = '×'
  del.addEventListener('click', e => { e.stopPropagation(); deletePhoto(idx) })
  thumb.appendChild(img); thumb.appendChild(del)
  thumb.addEventListener('click', () => openPhotoModal(idx))
  row.appendChild(thumb)
  thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  if (bar) bar.style.display = 'flex'
}

function deletePhoto(idx) {
  photos[idx] = null
  document.querySelectorAll(`.vf-thumb[data-idx="${idx}"]`).forEach(e => e.remove())
  updateDots()
  const alive = photos.filter(p => p !== null).length
  const bar = document.getElementById('vf-proceed-bar')
  if (!alive && bar) bar.style.display = 'none'
  updateCaptureState()
}

function clearPhotos() {
  photos = []
  const row = document.getElementById('vf-thumb-row'); if (row) row.innerHTML = ''
  const bar = document.getElementById('vf-proceed-bar'); if (bar) bar.style.display = 'none'
  updateDots(); updateCaptureState()
}

function startOver() {
  clearPhotos(); resultDataUrl = null
  const resultImg = document.getElementById('result-img')
  if (resultImg) { resultImg.src = ''; resultImg.style.display = 'none' }
  showScreen('screen-viewfinder')
}

/* ── Upload ── */
function triggerUpload() {
  const alive = photos.filter(p => p !== null).length
  if (alive >= LAYOUT_CAPS[currentLayout]) { showToast('Strip full — delete a photo first'); return }
  document.getElementById('upload-input').click()
}

async function handleUpload(e) {
  const files = Array.from(e.target.files); if (!files.length) return; e.target.value = ''
  const alive = photos.filter(p => p !== null).length
  const slots = LAYOUT_CAPS[currentLayout] - alive

  if (files.length > 1) {
    const toLoad = files.slice(0, slots)
    if (files.length > slots) showToast(`Only ${slots} slot${slots===1?'':'s'} left`)
    for (const f of toLoad) {
      try { addPhoto(await bakeFile(f)); await sleep(80) }
      catch (err) { showToast(`Could not load ${f.name}`) }
    }
    return
  }
  try { loadStillIntoViewfinder(await loadFileAsImage(files[0])) }
  catch { showToast('Could not load image') }
}

function loadFileAsImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('Not image')); return }
    const r = new FileReader()
    r.onerror = () => reject(new Error('Read failed'))
    r.onload  = ev => { const img = new Image(); img.onerror = () => reject(new Error('Decode failed')); img.onload = () => resolve(img); img.src = ev.target.result }
    r.readAsDataURL(file)
  })
}

function loadStillIntoViewfinder(img) {
  stillImage = img
  document.getElementById('startup').style.display = 'none'
  drawStillWithCurrentSettings()
  if (video) video.style.opacity = '0'
  document.getElementById('still-confirm').style.display = 'block'
  showToast('Adjust filter & frame then tap Add')
}

function drawStillWithCurrentSettings() {
  if (!stillImage) return
  const W = 1080, H = Math.round(W * 4 / 3)
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H
  const ctx = tmp.getContext('2d')
  const f = FILTERS[currentFilter] || FILTERS.none
  ctx.filter = f.css || 'none'
  const { sx,sy,sw,sh } = centreCrop(stillImage.naturalWidth, stillImage.naturalHeight, W, H)
  ctx.drawImage(stillImage, sx, sy, sw, sh, 0, 0, W, H)
  ctx.filter = 'none'
  paintFrameOnCanvas(ctx, W, H, currentFrame)
  const pi = document.getElementById('still-preview-img')
  if (pi) { pi.src = tmp.toDataURL('image/jpeg', 0.92); pi.style.display = 'block' }
}

function confirmStill() {
  if (!stillImage) return
  const W = 1080, H = Math.round(W * 4 / 3)
  previewCvs.width = W; previewCvs.height = H
  const f = FILTERS[currentFilter] || FILTERS.none
  previewCtx.filter = f.css || 'none'
  const {sx,sy,sw,sh} = centreCrop(stillImage.naturalWidth, stillImage.naturalHeight, W, H)
  previewCtx.drawImage(stillImage, sx, sy, sw, sh, 0, 0, W, H)
  previewCtx.filter = 'none'
  paintFrameOnCanvas(previewCtx, W, H, currentFrame)
  addPhoto(previewCvs.toDataURL('image/jpeg', 0.95))
  cancelStill()
}

function cancelStill() {
  stillImage = null
  const pi = document.getElementById('still-preview-img')
  if (pi) { pi.style.display = 'none'; pi.src = '' }
  if (video) video.style.opacity = '1'
  document.getElementById('still-confirm').style.display = 'none'
  if (!stream) document.getElementById('startup').style.display = 'flex'
}

async function bakeFile(file) {
  const img = await loadFileAsImage(file)
  const W = 1080, H = Math.round(W * 4 / 3)
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H
  const ctx = tmp.getContext('2d')
  const f = FILTERS[currentFilter] || FILTERS.none
  ctx.filter = f.css || 'none'
  const {sx,sy,sw,sh} = centreCrop(img.naturalWidth, img.naturalHeight, W, H)
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H)
  ctx.filter = 'none'
  return tmp.toDataURL('image/jpeg', 0.95)
}

/* ── Paint frame onto canvas ── */
function paintFrameOnCanvas(c, w, h, frame) {
  if (!frame || frame === 'none') return
  if (frame === 'frame-classic') {
    c.strokeStyle = '#f5f0e8'; c.lineWidth = 28; c.strokeRect(14,14,w-28,h-28)
    c.strokeStyle = '#d4c9a8'; c.lineWidth = 2;  c.strokeRect(28,28,w-56,h-56)
  }
  if (frame === 'frame-dark')  { c.strokeStyle = '#0a0a0a'; c.lineWidth = 24; c.strokeRect(12,12,w-24,h-24) }
  if (frame === 'frame-gold')  {
    const g = c.createLinearGradient(0,0,w,h)
    g.addColorStop(0,'#8b6914'); g.addColorStop(0.35,'#d4a853'); g.addColorStop(0.65,'#f0c96a'); g.addColorStop(1,'#8b6914')
    c.strokeStyle = g; c.lineWidth = 20; c.strokeRect(10,10,w-20,h-20)
  }
  if (frame === 'frame-pink')  { c.strokeStyle = '#f9cad8'; c.lineWidth = 22; c.strokeRect(11,11,w-22,h-22); c.strokeStyle = '#f4a7c0'; c.lineWidth = 2; c.strokeRect(22,22,w-44,h-44) }
  if (frame === 'frame-polaroid') { c.fillStyle = '#faf8f2'; c.fillRect(0,0,w,16); c.fillRect(0,0,16,h); c.fillRect(w-16,0,16,h); c.fillRect(0,h-56,w,56) }
  if (frame === 'frame-film')  {
    c.fillStyle = '#111'; c.fillRect(0,0,18,h); c.fillRect(w-18,0,18,h)
    c.fillStyle = '#222'; for (let y=12; y<h; y+=24) { c.fillRect(4,y,10,12); c.fillRect(w-14,y,10,12) }
  }
}

/* ── Customize screen preview — renders filter + frame onto canvas thumbnails ── */
function buildCustPreview() {
  const grid = document.getElementById('cust-preview-grid'); if (!grid) return
  const alive = photos.filter(p => p !== null)
  grid.innerHTML = ''
  grid.className = 'cust-preview-grid layout-' + currentLayout
  if (!alive.length) {
    grid.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text3);font-size:0.75rem;font-family:DM Mono,monospace">No photos yet</div>'
    return
  }

  const f = FILTERS[currentFilter] || FILTERS.none
  const isFilmreel = currentLayout === 'filmreel'
  const isPolaroid = currentLayout === 'polaroid'

  alive.forEach(p => {
    /* use a canvas so we can render filter + frame */
    const cvs = document.createElement('canvas')
    const TW = 300, TH = Math.round(TW * 4 / 3)
    cvs.width = TW; cvs.height = TH
    cvs.className = 'cust-prev-photo layout-' + currentLayout
    const ctx = cvs.getContext('2d')
    const img = new Image()
    img.onload = () => {
      /* filter */
      if (f.css) ctx.filter = f.css
      const {sx, sy, sw: sw2, sh: sh2} = centreCrop(img.naturalWidth, img.naturalHeight, TW, TH)
      ctx.drawImage(img, sx, sy, sw2, sh2, 0, 0, TW, TH)
      ctx.filter = 'none'
      /* frame */
      paintFrameOnCanvas(ctx, TW, TH, currentFrame)
    }
    img.src = p.dataUrl
    grid.appendChild(cvs)
  })

  /* apply bg color to preview wrapper */
  const wrap = document.getElementById('cust-preview')
  if (wrap) wrap.style.background = currentBg
}

/* ── Strip composition ── */
async function composeStrip(cvs, ctx2, alive, layout, ts, bg) {
  if (!alive.length) return
  const pad = 24, gap = 8
  const labelH = 52
  const footerH = ts ? 32 : 0
  const bgColor = bg || currentBg || '#0e0b10'

  const drawCropped = async (src, dx, dy, dw, dh) => {
    const img = await loadImg(src)
    const f = FILTERS[currentFilter] || FILTERS.none
    /* apply CSS filter via canvas */
    const tmp = document.createElement('canvas'); tmp.width = dw; tmp.height = dh
    const tc = tmp.getContext('2d')
    if (f.css) tc.filter = f.css
    const {sx,sy,sw,sh} = centreCrop(img.naturalWidth, img.naturalHeight, dw, dh)
    tc.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh)
    tc.filter = 'none'
    paintFrameOnCanvas(tc, dw, dh, currentFrame)
    ctx2.drawImage(tmp, dx, dy, dw, dh)
  }

  if (layout === 'strip4') {
    const sp = alive.slice(0,4); const iw = 500, ih = Math.round(iw*4/3)
    cvs.width = iw + pad*2
    cvs.height = labelH + pad + sp.length*ih + (sp.length-1)*gap + pad + footerH
    ctx2.fillStyle = bgColor; ctx2.fillRect(0,0,cvs.width,cvs.height)
    drawStripHeader(ctx2, cvs.width, labelH)
    for (let i=0; i<sp.length; i++) await drawCropped(sp[i].dataUrl, pad, labelH+pad+i*(ih+gap), iw, ih)
    if (ts) drawStripFooter(ctx2, cvs.width, cvs.height, footerH)

  } else if (layout === 'grid2x2') {
    const cp = alive.slice(0,6); const iw=320, ih=Math.round(iw*4/3), cols=2, rows=Math.ceil(cp.length/2)
    cvs.width = cols*iw+(cols+1)*gap; cvs.height = labelH+rows*ih+(rows+1)*gap+footerH
    ctx2.fillStyle = bgColor; ctx2.fillRect(0,0,cvs.width,cvs.height)
    drawStripHeader(ctx2, cvs.width, labelH)
    for (let i=0; i<cp.length; i++) {
      const col=i%2, row=Math.floor(i/2)
      await drawCropped(cp[i].dataUrl, gap+col*(iw+gap), labelH+gap+row*(ih+gap), iw, ih)
    }
    if (ts) drawStripFooter(ctx2, cvs.width, cvs.height, footerH)

  } else if (layout === 'filmreel') {
    const cp = alive.slice(0,8); const ih=280, iw=Math.round(ih*4/3), sH=30
    cvs.width = cp.length*(iw+gap)+gap; cvs.height = ih+sH*2+pad+footerH
    ctx2.fillStyle = bgColor === '#0e0b10' ? '#111' : bgColor; ctx2.fillRect(0,0,cvs.width,cvs.height)
    ctx2.fillStyle = 'rgba(0,0,0,0.4)'
    for (let x=12; x<cvs.width; x+=24) { ctx2.fillRect(x,6,12,16); ctx2.fillRect(x,cvs.height-footerH-22,12,16) }
    for (let i=0; i<cp.length; i++) await drawCropped(cp[i].dataUrl, gap+i*(iw+gap), sH, iw, ih)
    ctx2.fillStyle = '#f4a7c0'; ctx2.font='italic 11px "Playfair Display",serif'; ctx2.textAlign='left'
    ctx2.fillText('bilderbox', 10, cvs.height-footerH-6)
    if (ts) { ctx2.fillStyle='#5e5070'; ctx2.font='10px "DM Mono",monospace'; ctx2.textAlign='right'; ctx2.fillText(new Date().toLocaleDateString('en-GB'), cvs.width-10, cvs.height-8) }

  } else if (layout === 'polaroid') {
    const cp = alive.slice(0,6); const iw=240, ih=Math.round(iw*4/3), polPad=12, polBot=44
    const cols=2, rows=Math.ceil(cp.length/cols), gutter=28
    cvs.width = cols*(iw+polPad*2)+(cols+1)*gutter+40
    cvs.height = labelH+rows*(ih+polPad+polBot)+(rows-1)*gutter+50+footerH
    ctx2.fillStyle = bgColor; ctx2.fillRect(0,0,cvs.width,cvs.height)
    drawStripHeader(ctx2, cvs.width, labelH)
    const rots = [-5,4,-3,6,-2,5]
    for (let i=0; i<cp.length; i++) {
      const img = await loadImg(cp[i].dataUrl)
      const col=i%cols, row=Math.floor(i/cols)
      const cW=iw+polPad*2, cH=ih+polPad+polBot
      const cx=gutter+col*(cW+gutter)+cW/2+10, cy=labelH+gutter+row*(cH+gutter)+cH/2+10
      const rot=(rots[i%rots.length]||0)*Math.PI/180
      ctx2.save(); ctx2.translate(cx,cy); ctx2.rotate(rot)
      ctx2.shadowColor='rgba(0,0,0,0.5)'; ctx2.shadowBlur=16
      ctx2.fillStyle='#faf8f2'; ctx2.beginPath(); roundRect(ctx2,-cW/2,-cH/2,cW,cH,3); ctx2.fill()
      ctx2.shadowBlur=0
      const tmp = document.createElement('canvas'); tmp.width=iw; tmp.height=ih
      const tc = tmp.getContext('2d')
      const f = FILTERS[currentFilter]||FILTERS.none; if(f.css) tc.filter=f.css
      const {sx,sy,sw,sh}=centreCrop(img.naturalWidth,img.naturalHeight,iw,ih)
      tc.drawImage(img,sx,sy,sw,sh,0,0,iw,ih); tc.filter='none'
      paintFrameOnCanvas(tc,iw,ih,currentFrame)
      ctx2.drawImage(tmp,-iw/2,-cH/2+polPad,iw,ih)
      ctx2.fillStyle='#999'; ctx2.font='9px monospace'; ctx2.textAlign='center'
      ctx2.fillText(new Date().toLocaleDateString('en-GB'),0,cH/2-12)
      ctx2.restore()
    }
    if (ts) drawStripFooter(ctx2, cvs.width, cvs.height, footerH)
  }
}

function drawStripHeader(ctx2, w, lH) {
  ctx2.fillStyle='#f4a7c0'; ctx2.font='italic bold 20px "Playfair Display",serif'; ctx2.textAlign='center'
  ctx2.fillText('bilderbox', w/2, lH-12)
}
function drawStripFooter(ctx2, w, h, fH) {
  ctx2.fillStyle='#5e5070'; ctx2.font='11px "DM Mono",monospace'; ctx2.textAlign='center'
  ctx2.fillText(new Date().toLocaleDateString('en-GB'), w/2, h-Math.floor(fH/2))
}
function roundRect(c, x, y, w, h, r) {
  c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r)
  c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r)
  c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath()
}

/* ── Generate strip with film animation ── */
async function generateStrip() {
  const alive = photos.filter(p => p !== null)
  if (!alive.length) { showToast('No photos to generate'); return }

  /* go to generating screen */
  showScreen('screen-generating')

  /* set up film cells */
  const filmStrip = document.getElementById('gen-film-strip')
  const labelEl   = document.getElementById('gen-label-text')
  filmStrip.innerHTML = ''
  const count = Math.min(alive.length, 4)
  const cells = []
  for (let i = 0; i < count; i++) {
    const cell = document.createElement('div')
    cell.className = 'gen-film-cell'
    const img = document.createElement('img')
    img.src = alive[i].dataUrl; img.alt = ''
    cell.appendChild(img)
    filmStrip.appendChild(cell)
    cells.push(cell)
  }

  /* animate cells one by one */
  const labels = ['Developing your film…','Applying chemistry…','Fixing the image…','Almost ready…']
  for (let i = 0; i < cells.length; i++) {
    if (labelEl) labelEl.textContent = labels[Math.min(i, labels.length-1)]
    await sleep(350)
    cells[i].classList.add('developing')
    await sleep(900)
  }

  if (labelEl) labelEl.textContent = 'Finishing up…'
  await sleep(500)

  /* compose the actual strip */
  try {
    await composeStrip(stripCvs, stripCtx, alive, currentLayout, withTimestamp, currentBg)
    resultDataUrl = stripCvs.toDataURL('image/png')
  } catch (err) {
    showToast('Strip generation failed — please try again')
    console.error(err); showScreen('screen-customize'); return
  }

  /* show result */
  const resultImg = document.getElementById('result-img')
  if (resultImg) {
    resultImg.src = resultDataUrl
    resultImg.style.display = 'block'
  }
  document.getElementById('qr-section').style.display = 'none'
  showScreen('screen-result')
}

/* ── Result actions ── */
function downloadResult() {
  if (!resultDataUrl) return
  triggerDownload(resultDataUrl, 'bilderbox-strip-' + Date.now() + '.png')
  showToast('Strip saved!')
}

async function shareResult() {
  if (!resultDataUrl) return
  if (!navigator.share) { downloadResult(); return }
  try {
    const blob = await (await fetch(resultDataUrl)).blob()
    await navigator.share({ files: [new File([blob],'bilderbox-strip.png',{type:'image/png'})], title: 'bilderbox photobooth' })
  } catch (err) { if (!err.message?.toLowerCase().includes('cancel')) showToast('Share failed') }
}

async function shareToInstagram() { downloadResult(); showToast('Saved — open Instagram and post from your camera roll!') }

async function showQR() {
  const qrSection = document.getElementById('qr-section')
  const qrWrap    = document.getElementById('qr-code-wrap')
  if (!resultDataUrl) return
  qrSection.style.display = 'flex'
  qrWrap.innerHTML = '<div style="padding:1rem;color:#5e5070;font-size:0.7rem;font-family:DM Mono,monospace">Generating QR…</div>'
  try {
    const qrCvs = document.createElement('canvas')
    const ri = new Image(); await new Promise(r => { ri.onload = r; ri.src = resultDataUrl })
    const sc = Math.min(1, 300 / Math.max(ri.naturalWidth, ri.naturalHeight))
    qrCvs.width = Math.round(ri.naturalWidth * sc); qrCvs.height = Math.round(ri.naturalHeight * sc)
    qrCvs.getContext('2d').drawImage(ri, 0, 0, qrCvs.width, qrCvs.height)
    const imgSrc = qrCvs.toDataURL('image/jpeg', 0.7)
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>bilderbox</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0e0b10;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;padding:1.5rem;font-family:sans-serif}h1{color:#f4a7c0;font-size:1.1rem;font-style:italic}img{max-width:100%;border-radius:8px;display:block}a{color:#f4a7c0;font-size:.8rem;text-align:center;display:block}</style></head><body><h1>bilderbox</h1><img src="${imgSrc}"><a href="${imgSrc}" download="bilderbox.jpg">tap &amp; hold to save</a></body></html>`
    const encoded = 'data:text/html;charset=utf-8,' + encodeURIComponent(html)
    qrWrap.innerHTML = ''
    if (window.QRCode) new QRCode(qrWrap,{text:encoded,width:180,height:180,colorDark:'#f4a7c0',colorLight:'#0e0b10',correctLevel:QRCode.CorrectLevel.L})
    else qrWrap.textContent = 'QR library not loaded'
  } catch (err) { qrWrap.textContent = 'QR generation failed'; console.error(err) }
}

/* ── Photo modal ── */
function openPhotoModal(idx) {
  const p = photos[idx]; if (!p) return
  currentModalIdx = idx
  document.getElementById('modal-img').src = p.dataUrl
  document.getElementById('photo-modal').classList.add('open')
}
function downloadSingleFromModal() {
  if (currentModalIdx === null) return
  const p = photos[currentModalIdx]; if (!p) return
  triggerDownload(p.dataUrl, 'bilderbox-' + Date.now() + '.jpg')
  closeModal('photo-modal'); showToast('Saved!')
}
function deleteFromModal() {
  if (currentModalIdx === null) return
  deletePhoto(currentModalIdx); closeModal('photo-modal')
}
async function shareNativeSingle() {
  if (currentModalIdx === null) return
  const p = photos[currentModalIdx]; if (!p) return
  if (!navigator.share) { downloadSingleFromModal(); return }
  try {
    const blob = await (await fetch(p.dataUrl)).blob()
    await navigator.share({ files: [new File([blob],'bilderbox.jpg',{type:'image/jpeg'})], title:'bilderbox' })
  } catch (err) { if (!err.message?.toLowerCase().includes('cancel')) showToast('Share failed') }
}

/* ── Modals ── */
function closeModal(id) { document.getElementById(id)?.classList.remove('open') }
document.querySelectorAll('.modal-bg').forEach(bg => bg.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('open') }))
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal-bg.open').forEach(m => m.classList.remove('open')) })

/* ── Helpers ── */
function loadImg(src) {
  return new Promise((res, rej) => { const img = new Image(); img.onload=()=>res(img); img.onerror=()=>rej(new Error('load failed')); img.src=src })
}
function centreCrop(sw, sh, dw, dh) {
  const sr=sw/sh, dr=dw/dh; let sx=0,sy=0,s2w=sw,s2h=sh
  if (sr>dr) { s2w=sh*dr; sx=(sw-s2w)/2 } else { s2h=sw/dr; sy=(sh-s2h)/2 }
  return {sx,sy,sw:s2w,sh:s2h}
}
function triggerDownload(url, name) {
  try { const a=document.createElement('a'); a.href=url; a.download=name; a.click() }
  catch { showToast('Download failed — try right-clicking') }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

let toastTimer = null
function showToast(msg) {
  try {
    const t = document.getElementById('toast'); if (!t) return
    t.textContent = msg; t.classList.add('show')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800)
  } catch {}
}

updateCaptureState()
