/* ─────────────────────────────────────────
   Bilderbox — app.js  v6
───────────────────────────────────────── */

/* ── Global error boundary ── */
window.addEventListener('error', e => {
  if (!e.filename || e.filename.includes('cdn.')) return
  showErrorBoundary(`${e.message} (${e.filename?.split('/').pop()}:${e.lineno})`)
})
window.addEventListener('unhandledrejection', e => {
  const msg = e.reason?.message || String(e.reason) || 'Unknown error'
  if (msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('cancel')) return
  showErrorBoundary(msg)
})
function showErrorBoundary(msg) {
  const el = document.getElementById('error-boundary')
  const msgEl = document.getElementById('error-boundary-msg')
  if (!el) return
  if (msgEl) msgEl.textContent = msg || 'An unexpected error occurred.'
  el.style.display = 'flex'
}

/* ── Browser compat ── */
function checkBrowserCompat() {
  const issues = []
  if (!navigator.mediaDevices?.getUserMedia) issues.push('Camera API not supported in this browser')
  if (!window.HTMLCanvasElement) issues.push('Canvas not supported')
  if (issues.length) {
    const warn = document.getElementById('compat-warn')
    const msg  = document.getElementById('compat-warn-msg')
    if (warn && msg) { msg.textContent = issues.join(' · ') + '. Try Chrome or Safari.'; warn.style.display = 'flex' }
    ;['capture-btn','burst-btn'].forEach(id => { const btn = document.getElementById(id); if (btn) { btn.disabled = true; btn.title = issues[0] } })
  }
}
checkBrowserCompat()

/* ── PWA ── */
let deferredInstall = null
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstall = e
  const btn = document.getElementById('pwa-install-btn')
  if (btn) btn.style.display = 'inline-flex'
})
function installPWA() {
  if (!deferredInstall) return
  deferredInstall.prompt()
  deferredInstall.userChoice.then(() => { deferredInstall = null; const btn = document.getElementById('pwa-install-btn'); if (btn) btn.style.display = 'none' })
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(err => console.warn('SW failed:', err)))
}
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = window.navigator.standalone === true
if (isIOS && !isStandalone) { const hint = document.getElementById('ios-hint'); if (hint) hint.style.display = 'inline-flex' }

/* ── Theme ── */
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-mode')
  document.documentElement.classList.toggle('light-mode', isLight)
  try { localStorage.setItem('bb-theme', isLight ? 'light' : 'dark') } catch {}
  document.getElementById('theme-icon-dark').style.display  = isLight ? 'none'  : 'block'
  document.getElementById('theme-icon-light').style.display = isLight ? 'block' : 'none'
}
;(function() {
  try {
    if (localStorage.getItem('bb-theme') === 'light') {
      document.body.classList.add('light-mode')
      document.documentElement.classList.add('light-mode')
      document.getElementById('theme-icon-dark').style.display  = 'none'
      document.getElementById('theme-icon-light').style.display = 'block'
    }
  } catch {}
})()

/* ── Layout caps ── */
const LAYOUT_CAPS = { strip4: 4, grid2x2: 6, filmreel: 8, polaroid: 6 }
const LAYOUT_CAP_LABELS = {
  strip4:   'Max 4 photos · strip',
  grid2x2:  'Max 6 photos · 2×2 grid',
  filmreel: 'Max 8 photos · film reel',
  polaroid: 'Max 6 photos · polaroid',
}

/* ── Filters ── */
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

/* ── Frames — now with background colors for the camera wrap ── */
const FRAMES = [
  { id: 'none',           label: 'None',     thumb: '',                                    bg: '#0e0b10' },
  { id: 'frame-classic',  label: 'Classic',  thumb: 'outline:3px solid #f5f0e8;outline-offset:-3px;', bg: '#f5f0e8' },
  { id: 'frame-dark',     label: 'Dark',     thumb: 'outline:3px solid #111;outline-offset:-3px;',    bg: '#111111' },
  { id: 'frame-gold',     label: 'Gold',     thumb: 'outline:3px solid #d4a853;outline-offset:-3px;', bg: '#2a1f06' },
  { id: 'frame-pink',     label: 'Pink',     thumb: 'outline:3px solid #f4a7c0;outline-offset:-3px;', bg: '#fce8f1' },
  { id: 'frame-polaroid', label: 'Polaroid', thumb: 'outline:3px solid #faf8f2;outline-offset:-3px;', bg: '#faf8f2' },
  { id: 'frame-film',     label: 'Film',     thumb: 'box-shadow:3px 0 0 #111,-3px 0 0 #111;',        bg: '#111111' },
]

/* ── Layouts ── */
const LAYOUTS = [
  { id: 'strip4',   label: 'Strip',
    icon: `<div class="layout-icon" style="grid-template-columns:1fr;grid-template-rows:repeat(4,1fr);"><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div></div>` },
  { id: 'grid2x2',  label: '2×2',
    icon: `<div class="layout-icon" style="grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;"><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div></div>` },
  { id: 'filmreel', label: 'Reel',
    icon: `<div class="layout-icon" style="grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr;"><div class="cell"></div><div class="cell"></div><div class="cell"></div></div>` },
  { id: 'polaroid', label: 'Polaroid',
    icon: `<div class="layout-icon" style="grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;"><div class="cell" style="transform:rotate(-4deg)"></div><div class="cell" style="transform:rotate(3deg)"></div><div class="cell" style="transform:rotate(2deg)"></div><div class="cell" style="transform:rotate(-2deg)"></div></div>` },
]

/* ── State ── */
let currentFilter   = 'none'
let currentFrame    = 'none'
let currentLayout   = 'strip4'
let timerSecs       = 0
let photos          = []
let capturing       = false
let currentShareIdx = null
let shareFormat     = 'strip'
let stream          = null
let pendingStripDataUrl = null
let stillImage      = null

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
const printBtn    = document.getElementById('print-btn')
const shareHubBtn = document.getElementById('share-hub-btn')
const clearBtn    = document.getElementById('clear-btn')
const filterLabel = document.getElementById('live-filter-label')
const capHint     = document.getElementById('layout-cap-hint')
const cameraWrap  = document.getElementById('camera-wrap')

/* ── Build layout bar ── */
function buildLayoutBar(container) {
  if (!container) return
  container.innerHTML = ''
  LAYOUTS.forEach(l => {
    const btn = document.createElement('button')
    btn.className = 'layout-btn' + (l.id === currentLayout ? ' active' : '')
    btn.dataset.layoutId = l.id
    btn.innerHTML = l.icon + `<span>${l.label}</span>`
    btn.addEventListener('click', () => setLayout(l.id))
    container.appendChild(btn)
  })
}
buildLayoutBar(document.getElementById('layout-bar'))

/* ── Build frame grid ── */
function buildFrameGrid(container) {
  if (!container) return
  container.innerHTML = ''
  FRAMES.forEach(f => {
    const div = document.createElement('div')
    div.className = 'frame-thumb' + (f.id === currentFrame ? ' active' : '')
    div.dataset.frameId = f.id
    div.innerHTML = `<div class="frame-thumb-inner" style="${f.thumb}"></div>${f.label}`
    div.addEventListener('click', () => setFrame(f.id))
    container.appendChild(div)
  })
}
buildFrameGrid(document.getElementById('frames-grid'))

/* ── Camera ── */
async function startCamera() {
  document.getElementById('camera-error').style.display = 'none'
  document.getElementById('startup').style.display      = 'flex'
  if (!navigator.mediaDevices?.getUserMedia) { showCameraError('Your browser does not support camera access. Please use Chrome, Safari, or Firefox.'); return }
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') { showCameraError('Camera requires a secure connection (HTTPS).'); return }
  let newStream = null
  try {
    newStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 3840 }, height: { ideal: 2160 }, facingMode: 'user' }, audio: false })
  } catch (err) {
    if (['OverconstrainedError','NotReadableError','NotFoundError','AbortError'].includes(err.name)) {
      try { newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }) }
      catch (fe) { showCameraError(friendlyCameraError(fe)); return }
    } else { showCameraError(friendlyCameraError(err)); return }
  }
  stream = newStream
  video.srcObject = stream
  await new Promise(resolve => { video.onloadedmetadata = resolve; setTimeout(resolve, 3000) })
  document.getElementById('startup').style.display = 'none'
  updateCaptureState()
}
function friendlyCameraError(err) {
  switch (err.name) {
    case 'NotAllowedError': case 'PermissionDeniedError': return 'Camera access was denied. Click "How to fix this" below.'
    case 'NotFoundError':   case 'DevicesNotFoundError':  return 'No camera found on this device.'
    case 'NotReadableError': case 'TrackStartError':      return 'Camera is in use by another app.'
    case 'OverconstrainedError': return 'Camera settings not supported. Try again.'
    case 'SecurityError': return 'Camera blocked — make sure you\'re on HTTPS.'
    default: return `Camera error: ${err.message || err.name}`
  }
}
function showCameraError(msg) {
  document.getElementById('startup').style.display = 'none'
  const errEl = document.getElementById('camera-error'); const errMsg = document.getElementById('camera-error-msg')
  if (errMsg) errMsg.textContent = msg; if (errEl) errEl.style.display = 'flex'
}
async function retryCameraAccess() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
  video.srcObject = null
  document.getElementById('camera-error').style.display = 'none'
  document.getElementById('startup').style.display      = 'flex'
  await startCamera()
}
function showCameraHelp() { document.getElementById('camera-help-modal').classList.add('open') }

/* ── Filter ── */
function setFilter(id, btn) {
  currentFilter = id
  const f = FILTERS[id] || FILTERS.none
  video.style.filter = f.css || ''
  if (f.label) { filterLabel.textContent = f.label; filterLabel.classList.add('visible') }
  else { filterLabel.classList.remove('visible') }
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
  if (btn) btn.classList.add('active')
  if (stillImage) drawStillWithCurrentSettings()
}

/* ── Layout ── */
function setLayout(id) {
  currentLayout = id
  document.querySelectorAll('.layout-btn').forEach(b => b.classList.toggle('active', b.dataset.layoutId === id))
  if (capHint) capHint.textContent = LAYOUT_CAP_LABELS[id] || ''
  updateCaptureState()
}

/* ── Frame — also updates camera background color ── */
function setFrame(id) {
  currentFrame = id
  const overlay = document.getElementById('frame-overlay')
  overlay.className = 'frame-overlay'
  if (id !== 'none') overlay.classList.add(id)
  document.querySelectorAll('.frame-thumb').forEach(b => b.classList.toggle('active', b.dataset.frameId === id))
  /* update camera wrap background to match frame color */
  const frameDef = FRAMES.find(f => f.id === id)
  if (cameraWrap && frameDef) cameraWrap.style.background = frameDef.bg
  if (stillImage) drawStillWithCurrentSettings()
}

/* ── Mood ── */
const MOOD_FILTERS = { happy: 'vivid', dreamy: 'fade', moody: 'noir', retro: 'kodak', y2k: 'y2k' }
function setMood(id) {
  document.querySelectorAll('.mood').forEach(m => m.classList.toggle('active', m.title === id))
  const filterId = MOOD_FILTERS[id] || 'none'
  const btn = document.querySelector(`.filter-btn[data-filter="${filterId}"]`)
  setFilter(filterId, btn)
}

/* ── Timer ── */
function setTimer(s, btn) {
  timerSecs = s
  document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
}

/* ── Update capture state ── */
function updateCaptureState() {
  const alive = photos.filter(p => p !== null)
  const cap   = LAYOUT_CAPS[currentLayout]
  const full  = alive.length >= cap
  captureBtn.disabled = !stream || full
  burstBtn.disabled   = !stream || full
  const uploadBtn = document.getElementById('upload-btn')
  if (uploadBtn) uploadBtn.disabled = full
  if (full) showToast(`${cap}/${cap} photos — clear to shoot more or switch layout`)
}

/* ── Capture ── */
async function capturePhoto() {
  if (capturing || !stream) return
  if (photos.filter(p => p !== null).length >= LAYOUT_CAPS[currentLayout]) return
  capturing = true; captureBtn.disabled = burstBtn.disabled = true
  try {
    if (timerSecs > 0) await countdown(timerSecs)
    doFlash(); addPhoto(grabFrame()); await sleep(180)
  } catch (err) { showToast('Capture failed — please try again'); console.error('Capture error:', err) }
  finally { capturing = false; updateCaptureState() }
}

/* ── FIX 1: Burst now repeats timer for each shot ── */
async function startBurst() {
  if (capturing || !stream) return
  const cap = LAYOUT_CAPS[currentLayout]
  if (photos.filter(p => p !== null).length >= cap) return
  capturing = true; captureBtn.disabled = burstBtn.disabled = true
  try {
    const slots = Math.min(4, cap - photos.filter(p => p !== null).length)
    for (let i = 0; i < slots; i++) {
      /* each burst shot gets its own timer countdown */
      if (timerSecs > 0) await countdown(timerSecs)
      doFlash(); addPhoto(grabFrame())
      if (i < slots - 1) await sleep(400)
    }
    await sleep(180)
  } catch (err) { showToast('Burst failed — please try again'); console.error('Burst error:', err) }
  finally { capturing = false; updateCaptureState() }
}

async function countdown(secs) {
  countdownEl.style.opacity = '1'
  for (let i = secs; i >= 1; i--) { countdownEl.textContent = i; await sleep(1000) }
  countdownEl.style.opacity = '0'
}
function doFlash() { flashEl.classList.remove('active'); void flashEl.offsetWidth; flashEl.classList.add('active') }

/* ── Grab frame ── */
function grabFrame() {
  const w = video.videoWidth || 1280; const h = video.videoHeight || 960
  previewCvs.width = w; previewCvs.height = h
  const f = FILTERS[currentFilter] || FILTERS.none
  previewCtx.filter = f.css || 'none'
  previewCtx.save(); previewCtx.scale(-1, 1); previewCtx.drawImage(video, -w, 0, w, h); previewCtx.restore()
  previewCtx.filter = 'none'
  paintFrame(previewCtx, w, h, currentFrame)
  return previewCvs.toDataURL('image/jpeg', 0.95)
}

/* ── FIX 2: Paint frame — now also fills bg color before drawing frame ── */
function paintFrame(c, w, h, frame) {
  if (!frame || frame === 'none') return
  const frameDef = FRAMES.find(f => f.id === frame)
  /* fill background first for non-dark frames */
  if (frameDef && frameDef.bg && frameDef.bg !== '#0e0b10' && frameDef.bg !== '#111111') {
    /* only fill corners/edges that the frame covers — use save/restore */
  }
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
  if (frame === 'frame-pink')  {
    c.strokeStyle = '#f9cad8'; c.lineWidth = 22; c.strokeRect(11,11,w-22,h-22)
    c.strokeStyle = '#f4a7c0'; c.lineWidth = 2;  c.strokeRect(22,22,w-44,h-44)
  }
  if (frame === 'frame-polaroid') {
    c.fillStyle = '#faf8f2'
    c.fillRect(0,0,w,16); c.fillRect(0,0,16,h); c.fillRect(w-16,0,16,h); c.fillRect(0,h-56,w,56)
  }
  if (frame === 'frame-film') {
    c.fillStyle = '#111'; c.fillRect(0,0,18,h); c.fillRect(w-18,0,18,h)
    c.fillStyle = '#222'
    for (let y=12; y<h; y+=24) { c.fillRect(4,y,10,12); c.fillRect(w-14,y,10,12) }
  }
}

/* ── Upload — single file shows in viewfinder, multi-file adds directly ── */
function triggerUpload() {
  const alive = photos.filter(p => p !== null)
  if (alive.length >= LAYOUT_CAPS[currentLayout]) { showToast('Strip full — clear or switch layout'); return }
  document.getElementById('upload-input').click()
}

async function handleUpload(e) {
  const files = Array.from(e.target.files); if (!files.length) return; e.target.value = ''
  const alive = photos.filter(p => p !== null); const cap = LAYOUT_CAPS[currentLayout]; const slots = cap - alive.length
  if (files.length > 1) {
    const toLoad = files.slice(0, slots)
    if (files.length > slots) showToast(`Only ${slots} slot${slots===1?'':'s'} left — adding first ${slots}`)
    for (const file of toLoad) { try { addPhoto(await bakeUploadedImage(file)); await sleep(80) } catch (err) { showToast(`Could not load ${file.name}`) } }
    return
  }
  try { loadStillIntoViewfinder(await loadFileAsImage(files[0])) }
  catch { showToast('Could not load image — try another file') }
}

function loadFileAsImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('Not an image')); return }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Read failed'))
    reader.onload  = ev => { const img = new Image(); img.onerror = () => reject(new Error('Decode failed')); img.onload = () => resolve(img); img.src = ev.target.result }
    reader.readAsDataURL(file)
  })
}

function loadStillIntoViewfinder(img) {
  stillImage = img
  document.getElementById('startup').style.display = 'none'
  drawStillWithCurrentSettings()
  video.style.opacity = '0'
  document.getElementById('still-confirm').style.display = 'block'
  showToast('Pick a filter and frame, then tap Add to strip')
}

function drawStillWithCurrentSettings() {
  if (!stillImage) return
  const targetW = 1080; const targetH = Math.round(targetW * 4 / 3)
  /* draw onto a temp canvas, show result in the overlay img */
  const tmp = document.createElement('canvas'); tmp.width = targetW; tmp.height = targetH
  const tmpCtx = tmp.getContext('2d')
  const f = FILTERS[currentFilter] || FILTERS.none
  tmpCtx.filter = f.css || 'none'
  const { sx, sy, sw, sh } = centreCrop(stillImage.naturalWidth, stillImage.naturalHeight, targetW, targetH)
  tmpCtx.drawImage(stillImage, sx, sy, sw, sh, 0, 0, targetW, targetH)
  tmpCtx.filter = 'none'
  paintFrame(tmpCtx, targetW, targetH, currentFrame)
  const previewImg = document.getElementById('still-preview-img')
  if (previewImg) { previewImg.src = tmp.toDataURL('image/jpeg', 0.92); previewImg.style.display = 'block' }
}

function confirmStill() {
  if (!stillImage) return
  const targetW = 1080; const targetH = Math.round(targetW * 4 / 3)
  previewCvs.width = targetW; previewCvs.height = targetH
  const f = FILTERS[currentFilter] || FILTERS.none
  previewCtx.filter = f.css || 'none'
  const { sx, sy, sw, sh } = centreCrop(stillImage.naturalWidth, stillImage.naturalHeight, targetW, targetH)
  previewCtx.drawImage(stillImage, sx, sy, sw, sh, 0, 0, targetW, targetH)
  previewCtx.filter = 'none'
  paintFrame(previewCtx, targetW, targetH, currentFrame)
  addPhoto(previewCvs.toDataURL('image/jpeg', 0.95))
  cancelStill()
}

function cancelStill() {
  stillImage = null
  const previewImg = document.getElementById('still-preview-img')
  if (previewImg) { previewImg.style.display = 'none'; previewImg.src = '' }
  video.style.opacity = '1'
  document.getElementById('still-confirm').style.display = 'none'
  if (!stream) document.getElementById('startup').style.display = 'flex'
}

async function bakeUploadedImage(file) {
  const img = await loadFileAsImage(file); return normalizeAndBakeImage(img)
}

/* ── Image loader ── */
function loadImg(src) {
  return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Failed to load image')); img.src = src })
}

/* ── FIX 3: Strip composition — proper aspect ratio for all layouts ── */
async function composeStrip(cvs, ctx2, alive, layout, withTimestamp) {
  if (!alive.length) return
  const pad = 24, gap = 8, bg = '#0e0b10'
  const labelH  = 52
  const footerH = withTimestamp ? 32 : 0

  /* helper: draw image with proper 3:4 centre-crop into destination rect */
  const drawCropped = async (src, dx, dy, dw, dh) => {
    const img = await loadImg(src)
    const { sx, sy, sw, sh } = centreCrop(img.naturalWidth, img.naturalHeight, dw, dh)
    ctx2.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
  }

  if (layout === 'strip4') {
    const stripPhotos = alive.slice(0, 4)
    const iw = 500, ih = Math.round(iw * 4 / 3)
    cvs.width  = iw + pad * 2
    cvs.height = labelH + pad + stripPhotos.length * ih + (stripPhotos.length - 1) * gap + pad + footerH
    ctx2.fillStyle = bg; ctx2.fillRect(0, 0, cvs.width, cvs.height)
    drawStripHeader(ctx2, cvs.width, labelH)
    for (let i = 0; i < stripPhotos.length; i++) {
      await drawCropped(stripPhotos[i].dataUrl, pad, labelH + pad + i * (ih + gap), iw, ih)
    }
    if (withTimestamp) drawStripFooter(ctx2, cvs.width, cvs.height, footerH)

  } else if (layout === 'grid2x2') {
    const capped = alive.slice(0, 6)
    const iw = 320, ih = Math.round(iw * 4 / 3)   /* FIX: use 3:4 ratio not square */
    const cols = 2, rows = Math.ceil(capped.length / 2)
    cvs.width  = cols * iw + (cols + 1) * gap
    cvs.height = labelH + rows * ih + (rows + 1) * gap + footerH
    ctx2.fillStyle = bg; ctx2.fillRect(0, 0, cvs.width, cvs.height)
    drawStripHeader(ctx2, cvs.width, labelH)
    for (let i = 0; i < capped.length; i++) {
      const col = i % 2, row = Math.floor(i / 2)
      await drawCropped(capped[i].dataUrl, gap + col * (iw + gap), labelH + gap + row * (ih + gap), iw, ih)
    }
    if (withTimestamp) drawStripFooter(ctx2, cvs.width, cvs.height, footerH)

  } else if (layout === 'filmreel') {
    const capped = alive.slice(0, 8)
    const ih = 280, iw = Math.round(ih * 4 / 3), sprocketH = 30
    cvs.width  = capped.length * (iw + gap) + gap
    cvs.height = ih + sprocketH * 2 + pad + footerH
    ctx2.fillStyle = '#111'; ctx2.fillRect(0, 0, cvs.width, cvs.height)
    ctx2.fillStyle = '#222'
    for (let x = 12; x < cvs.width; x += 24) { ctx2.fillRect(x, 6, 12, 16); ctx2.fillRect(x, cvs.height - footerH - 22, 12, 16) }
    for (let i = 0; i < capped.length; i++) {
      await drawCropped(capped[i].dataUrl, gap + i * (iw + gap), sprocketH, iw, ih)
    }
    ctx2.fillStyle = '#f4a7c0'; ctx2.font = 'italic 11px "Playfair Display", serif'; ctx2.textAlign = 'left'
    ctx2.fillText('bilderbox', 10, cvs.height - footerH - 6)
    if (withTimestamp) { ctx2.fillStyle = '#5e5070'; ctx2.font = '10px "DM Mono", monospace'; ctx2.textAlign = 'right'; ctx2.fillText(new Date().toLocaleDateString('en-GB'), cvs.width - 10, cvs.height - 8) }

  } else if (layout === 'polaroid') {
    const capped = alive.slice(0, 6)
    const iw = 240, ih = Math.round(iw * 4 / 3)   /* FIX: 3:4 ratio */
    const polPad = 12, polBot = 44
    const cols = 2, rows = Math.ceil(capped.length / cols), gutter = 28
    cvs.width  = cols * (iw + polPad * 2) + (cols + 1) * gutter + 40
    cvs.height = labelH + rows * (ih + polPad + polBot) + (rows - 1) * gutter + 50 + footerH
    ctx2.fillStyle = '#1a0f20'; ctx2.fillRect(0, 0, cvs.width, cvs.height)
    drawStripHeader(ctx2, cvs.width, labelH)
    const rotations = [-5, 4, -3, 6, -2, 5]
    for (let i = 0; i < capped.length; i++) {
      const img = await loadImg(capped[i].dataUrl)
      const col = i % cols, row = Math.floor(i / cols)
      const cardW = iw + polPad * 2, cardH = ih + polPad + polBot
      const cx = gutter + col * (cardW + gutter) + cardW / 2 + 10
      const cy = labelH + gutter + row * (cardH + gutter) + cardH / 2 + 10
      const rot = (rotations[i % rotations.length] || 0) * Math.PI / 180
      ctx2.save(); ctx2.translate(cx, cy); ctx2.rotate(rot)
      ctx2.shadowColor = 'rgba(0,0,0,0.5)'; ctx2.shadowBlur = 16
      ctx2.fillStyle = '#faf8f2'; ctx2.beginPath(); roundRect(ctx2, -cardW/2, -cardH/2, cardW, cardH, 3); ctx2.fill()
      ctx2.shadowBlur = 0
      const { sx, sy, sw, sh } = centreCrop(img.naturalWidth, img.naturalHeight, iw, ih)
      ctx2.drawImage(img, sx, sy, sw, sh, -iw/2, -cardH/2 + polPad, iw, ih)
      ctx2.fillStyle = '#999'; ctx2.font = '9px monospace'; ctx2.textAlign = 'center'
      ctx2.fillText(new Date().toLocaleDateString('en-GB'), 0, cardH/2 - 12)
      ctx2.restore()
    }
    if (withTimestamp) drawStripFooter(ctx2, cvs.width, cvs.height, footerH)
  }
}

function roundRect(c, x, y, w, h, r) {
  c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r)
  c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r)
  c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath()
}
function drawStripHeader(ctx2, w, labelH) {
  ctx2.fillStyle = '#f4a7c0'; ctx2.font = 'italic bold 20px "Playfair Display", serif'; ctx2.textAlign = 'center'
  ctx2.fillText('bilderbox', w / 2, labelH - 12)
}
function drawStripFooter(ctx2, w, h, footerH) {
  ctx2.fillStyle = '#5e5070'; ctx2.font = '11px "DM Mono", monospace'; ctx2.textAlign = 'center'
  ctx2.fillText(new Date().toLocaleDateString('en-GB'), w / 2, h - Math.floor(footerH / 2))
}

/* ── Download strip ── */
async function downloadStrip() {
  const alive = photos.filter(p => p !== null); if (!alive.length) return
  printBtn.disabled = true
  try {
    await composeStrip(stripCvs, stripCtx, alive, currentLayout, false)
    pendingStripDataUrl = stripCvs.toDataURL('image/png')
    const tsPrev = document.getElementById('ts-preview-canvas')
    if (tsPrev) { tsPrev.width = stripCvs.width; tsPrev.height = stripCvs.height; tsPrev.getContext('2d').drawImage(stripCvs,0,0); tsPrev.style.width='100%'; tsPrev.style.height='auto' }
    document.getElementById('timestamp-modal').classList.add('open')
  } catch (err) { showToast('Could not generate strip — please try again'); console.error(err) }
  finally { printBtn.disabled = false }
}

async function finalizeDownload(withTimestamp) {
  closeModal('timestamp-modal')
  const alive = photos.filter(p => p !== null)
  if (withTimestamp) {
    try { await composeStrip(stripCvs, stripCtx, alive, currentLayout, true); pendingStripDataUrl = stripCvs.toDataURL('image/png') }
    catch (err) { showToast('Could not add timestamp — saving without it'); console.error(err) }
  }
  const prevImg = document.getElementById('strip-preview-img')
  if (prevImg) prevImg.src = pendingStripDataUrl
  document.getElementById('strip-preview-modal').classList.add('open')
  triggerDownload(pendingStripDataUrl, 'bilderbox-strip-' + Date.now() + '.png')
  showToast('Strip saved!')
}

function redownloadStrip() {
  if (!pendingStripDataUrl) return
  triggerDownload(pendingStripDataUrl, 'bilderbox-strip-' + Date.now() + '.png')
  showToast('Downloaded!')
}

async function shareStripFromPreview() {
  if (!pendingStripDataUrl) return
  if (!navigator.share) { triggerDownload(pendingStripDataUrl, 'bilderbox-strip.png'); return }
  try {
    const blob = await (await fetch(pendingStripDataUrl)).blob()
    await navigator.share({ files: [new File([blob], 'bilderbox-strip.png', { type: 'image/png' })], title: 'bilderbox photobooth' })
  } catch (err) { if (!err.message?.toLowerCase().includes('cancel')) showToast('Share failed') }
}

/* ── Photo management ── */
function addPhoto(dataUrl) {
  const alive = photos.filter(p => p !== null)
  if (alive.length >= LAYOUT_CAPS[currentLayout]) return
  const idx = photos.length; photos.push({ dataUrl })
  /* update mobile thumbnail strip */
  const mobileStrip = document.getElementById('mobile-thumbnail-strip')
  if (mobileStrip) {
    const thumb = document.createElement('div')
    thumb.className = 'mobile-thumb'; thumb.dataset.idx = idx
    const img = document.createElement('img'); img.src = dataUrl; img.alt = 'Photo ' + (idx+1)
    const del = document.createElement('button'); del.className = 'mobile-thumb-del'; del.textContent = '×'
    del.addEventListener('click', e => { e.stopPropagation(); deletePhoto(idx) })
    thumb.appendChild(img); thumb.appendChild(del)
    thumb.addEventListener('click', () => openPhotoModal(idx))
    mobileStrip.appendChild(thumb)
    thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }
  /* desktop strip */
  ;['strip-wrap-desktop','strip-wrap-mobile'].forEach(wrapId => {
    const wrap = document.getElementById(wrapId); if (!wrap) return
    wrap.querySelectorAll('.strip-empty').forEach(e => e.style.display = 'none')
    wrap.appendChild(buildStripItem(dataUrl, idx))
    wrap.lastChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
  printBtn.disabled = shareHubBtn.disabled = clearBtn.disabled = false
  updateCaptureState()
}

function buildStripItem(dataUrl, idx) {
  const item = document.createElement('div'); item.className = 'strip-item'; item.dataset.idx = idx
  const img = document.createElement('img'); img.src = dataUrl; img.alt = 'Photo ' + (idx+1); img.loading = 'lazy'
  const actions = document.createElement('div'); actions.className = 'strip-actions'
  ;[{ label: 'View', fn: () => openPhotoModal(idx) },{ label: 'Save', fn: () => downloadPhotoIdx(idx) },{ label: 'Delete', fn: () => deletePhoto(idx), danger: true }].forEach(b => {
    const btn = document.createElement('button'); btn.className = 'strip-action-btn'; btn.textContent = b.label
    if (b.danger) btn.style.borderColor = 'rgba(200,75,58,0.5)'
    btn.addEventListener('click', e => { e.stopPropagation(); b.fn() }); actions.appendChild(btn)
  })
  item.appendChild(img); item.appendChild(actions); return item
}

function deletePhoto(idx) {
  photos[idx] = null
  document.querySelectorAll(`.strip-item[data-idx="${idx}"]`).forEach(el => el.remove())
  document.querySelectorAll(`.mobile-thumb[data-idx="${idx}"]`).forEach(el => el.remove())
  const alive = photos.filter(p => p !== null)
  if (!alive.length) {
    printBtn.disabled = shareHubBtn.disabled = clearBtn.disabled = true
    document.querySelectorAll('.strip-empty').forEach(e => e.style.display = 'block')
  }
  updateCaptureState()
}

function clearAll() {
  photos = []; pendingStripDataUrl = null
  document.querySelectorAll('.strip-item').forEach(el => el.remove())
  document.querySelectorAll('.mobile-thumb').forEach(el => el.remove())
  document.querySelectorAll('.strip-empty').forEach(e => e.style.display = 'block')
  printBtn.disabled = shareHubBtn.disabled = clearBtn.disabled = true
  updateCaptureState()
}

/* ── Share hub ── */
function openShareHub() {
  if (!photos.filter(p => p !== null).length) return
  document.getElementById('qr-section').style.display = 'none'
  setShareFormat('strip', document.querySelector('.share-layout-btn'))
  buildSharePreview()
  document.getElementById('share-modal').classList.add('open')
}
function setShareFormat(fmt, btn) {
  shareFormat = fmt
  document.querySelectorAll('.share-layout-btn').forEach(b => b.classList.remove('active'))
  if (btn) btn.classList.add('active')
  buildSharePreview()
}
async function buildSharePreview() {
  const alive = photos.filter(p => p !== null); if (!alive.length) return
  const cvs = document.getElementById('share-preview-canvas'); const ctx2 = cvs.getContext('2d')
  try {
    if (shareFormat === 'reel') {
      const sw = 480, sh = Math.round(480 * 16 / 9)
      cvs.width = sw; cvs.height = sh
      ctx2.fillStyle = '#0e0b10'; ctx2.fillRect(0,0,sw,sh)
      ctx2.fillStyle = '#f4a7c0'; ctx2.font = 'italic bold 22px "Playfair Display", serif'; ctx2.textAlign = 'center'; ctx2.fillText('bilderbox', sw/2, 44)
      const iw = sw - 40, ih = Math.round(iw * 4 / 3)
      const sliceCount = Math.min(alive.length, 4); const totalImgH = sliceCount * (ih + 10); const startY = (sh - totalImgH) / 2
      for (let i = 0; i < sliceCount; i++) {
        const img = await loadImg(alive[i].dataUrl)
        const { sx, sy, sw: sw2, sh: sh2 } = centreCrop(img.naturalWidth, img.naturalHeight, iw, ih)
        ctx2.drawImage(img, sx, sy, sw2, sh2, 20, startY + i * (ih + 10), iw, ih)
      }
      ctx2.fillStyle = '#5e5070'; ctx2.font = '10px "DM Mono", monospace'; ctx2.textAlign = 'center'; ctx2.fillText(new Date().toLocaleDateString('en-GB'), sw/2, sh-8)
    } else if (shareFormat === 'grid') {
      const sz = 480, padG = 6; cvs.width = sz; cvs.height = sz
      ctx2.fillStyle = '#0e0b10'; ctx2.fillRect(0,0,sz,sz)
      const iw = (sz - padG * 3) / 2, ih = Math.round(iw * 4 / 3)   /* FIX: 3:4 */
      for (let i = 0; i < Math.min(alive.length, 4); i++) {
        const img = await loadImg(alive[i].dataUrl)
        const col = i % 2, row = Math.floor(i / 2)
        const { sx, sy, sw: sw2, sh: sh2 } = centreCrop(img.naturalWidth, img.naturalHeight, iw, ih)
        ctx2.drawImage(img, sx, sy, sw2, sh2, padG + col*(iw+padG), padG + row*(ih+padG), iw, ih)
      }
    } else { await composeStrip(cvs, ctx2, alive, currentLayout, false) }
    cvs.style.width = '100%'; cvs.style.height = 'auto'
  } catch (err) { console.error('Share preview error:', err); showToast('Preview failed — try again') }
}

async function shareToInstagram() { await downloadShareImage(); showToast('Saved — open Instagram and post from your camera roll!') }
async function shareNative() {
  const cvs = document.getElementById('share-preview-canvas')
  if (!navigator.share) { await downloadShareImage(); return }
  try { await navigator.share({ files: [new File([await canvasToBlob(cvs)], 'bilderbox.png', { type: 'image/png' })], title: 'bilderbox photobooth' }) }
  catch (err) { if (!err.message?.toLowerCase().includes('cancel')) showToast('Share failed — try downloading instead') }
}
async function shareNativeSingle() {
  if (currentShareIdx === null) return; const p = photos[currentShareIdx]
  if (!p || !navigator.share) { downloadSingle(); return }
  try { await navigator.share({ files: [new File([await (await fetch(p.dataUrl)).blob()], 'bilderbox.jpg', { type: 'image/jpeg' })], title: 'bilderbox photobooth' }) }
  catch (err) { if (!err.message?.toLowerCase().includes('cancel')) showToast('Share failed') }
}
async function downloadShareImage() {
  const cvs = document.getElementById('share-preview-canvas')
  try { triggerDownload(cvs.toDataURL('image/png'), 'bilderbox-' + Date.now() + '.png'); showToast('Saved!') }
  catch { showToast('Download failed — please try again') }
}

/* ── QR ── */
async function showQR() {
  const qrSection = document.getElementById('qr-section'); const qrWrap = document.getElementById('qr-code-wrap')
  const alive = photos.filter(p => p !== null); if (!alive.length) { showToast('No photos yet'); return }
  qrSection.style.display = 'flex'
  qrWrap.innerHTML = '<div style="color:var(--text3);font-size:0.7rem;padding:1rem;">Generating QR…</div>'
  try {
    const previewCanvas = document.getElementById('share-preview-canvas')
    const qrCvs = document.createElement('canvas')
    const scale = Math.min(1, 300 / Math.max(previewCanvas.width, previewCanvas.height))
    qrCvs.width = Math.round(previewCanvas.width * scale); qrCvs.height = Math.round(previewCanvas.height * scale)
    qrCvs.getContext('2d').drawImage(previewCanvas, 0, 0, qrCvs.width, qrCvs.height)
    const imgSrc = qrCvs.toDataURL('image/jpeg', 0.7)
    const pageHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>bilderbox</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0e0b10;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;padding:1.5rem;font-family:sans-serif}h1{color:#f4a7c0;font-size:1.1rem;font-style:italic}img{max-width:100%;border-radius:8px;display:block}a{color:#f4a7c0;font-size:.8rem;text-align:center;display:block}</style></head><body><h1>bilderbox</h1><img src="${imgSrc}"><a href="${imgSrc}" download="bilderbox.jpg">tap &amp; hold to save</a></body></html>`
    const encoded = 'data:text/html;charset=utf-8,' + encodeURIComponent(pageHtml)
    qrWrap.innerHTML = ''
    if (window.QRCode) new QRCode(qrWrap, { text: encoded, width: 180, height: 180, colorDark: '#f4a7c0', colorLight: '#0e0b10', correctLevel: QRCode.CorrectLevel.L })
    else qrWrap.textContent = 'QR library not loaded'
  } catch (err) { qrWrap.textContent = 'QR generation failed'; console.error('QR error:', err) }
  qrSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

/* ── Photo modal ── */
function openPhotoModal(idx) {
  const p = photos[idx]; if (!p) return; currentShareIdx = idx
  document.getElementById('modal-img').src = p.dataUrl; document.getElementById('photo-modal').classList.add('open')
}
function downloadSingle() {
  if (currentShareIdx === null) return; const p = photos[currentShareIdx]
  if (p) triggerDownload(p.dataUrl, 'bilderbox-' + Date.now() + '.jpg')
  closeModal('photo-modal'); showToast('Photo saved!')
}
function deleteCurrent() { if (currentShareIdx === null) return; deletePhoto(currentShareIdx); closeModal('photo-modal') }
function downloadPhotoIdx(idx) { const p = photos[idx]; if (!p) return; triggerDownload(p.dataUrl, 'bilderbox-' + Date.now() + '.jpg'); showToast('Photo saved!') }

/* ── Modals ── */
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); if (id === 'photo-modal') currentShareIdx = null }
document.querySelectorAll('.modal-bg').forEach(bg => bg.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('open') }))
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; document.querySelectorAll('.modal-bg.open').forEach(m => m.classList.remove('open')); currentShareIdx = null })

/* ── Helpers ── */
function triggerDownload(dataUrl, filename) { try { const a = document.createElement('a'); a.href = dataUrl; a.download = filename; a.click() } catch { showToast('Download failed — try right-clicking to save') } }
function canvasToBlob(cvs) { return new Promise((resolve, reject) => { try { cvs.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png') } catch(e) { reject(e) } }) }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
let toastTimer = null
function showToast(msg) { try { const t = document.getElementById('toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600) } catch {} }
function centreCrop(srcW, srcH, dstW, dstH) {
  const srcRatio = srcW / srcH, dstRatio = dstW / dstH
  let sx = 0, sy = 0, sw = srcW, sh = srcH
  if (srcRatio > dstRatio) { sw = srcH * dstRatio; sx = (srcW - sw) / 2 }
  else                      { sh = srcW / dstRatio; sy = (srcH - sh) / 2 }
  return { sx, sy, sw, sh }
}
function normalizeAndBakeImage(img) {
  const targetW = 1080, targetH = Math.round(targetW * 4 / 3)
  previewCvs.width = targetW; previewCvs.height = targetH
  const f = FILTERS[currentFilter] || FILTERS.none; previewCtx.filter = f.css || 'none'
  const { sx, sy, sw, sh } = centreCrop(img.naturalWidth, img.naturalHeight, targetW, targetH)
  previewCtx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH)
  previewCtx.filter = 'none'; paintFrame(previewCtx, targetW, targetH, currentFrame)
  return previewCvs.toDataURL('image/jpeg', 0.95)
}

updateCaptureState()
