/* ─────────────────────────────────────────
   Bilderbox — app.js
   All features: camera, filters, layouts,
   frames, share hub, QR, PWA install
───────────────────────────────────────── */

/* ─── PWA install ─── */
let deferredInstall = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstall = e;
  const btn = document.getElementById("pwa-install-btn");
  if (btn) btn.style.display = "inline-flex";
});

function installPWA() {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  deferredInstall.userChoice.then(() => {
    deferredInstall = null;
    const btn = document.getElementById("pwa-install-btn");
    if (btn) btn.style.display = "none";
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.navigator.standalone === true;
if (isIOS && !isStandalone) {
  document.getElementById("ios-hint").style.display = "inline-flex";
}

/* ─────────────────────────────────────────
   Filter definitions
───────────────────────────────────────── */
const FILTERS = {
  none: { css: "", label: "" },
  bw: { css: "grayscale(100%)", label: "B&W" },
  sepia: { css: "sepia(80%)", label: "Sepia" },
  vivid: { css: "contrast(1.3) saturate(1.5)", label: "Vivid" },
  fade: { css: "brightness(1.1) contrast(0.82) saturate(0.65)", label: "Fade" },
  noir: { css: "contrast(1.5) brightness(0.82) grayscale(30%)", label: "Noir" },
  warm: { css: "saturate(1.8) hue-rotate(-18deg)", label: "Warm" },
  /* new */
  disposable: {
    css: "contrast(1.15) saturate(1.25) sepia(20%) brightness(1.08)",
    label: "Disposable",
  },
  kodak: {
    css: "sepia(35%) contrast(1.1) saturate(1.3) hue-rotate(5deg)",
    label: "Kodak",
  },
  fujifilm: {
    css: "saturate(1.4) hue-rotate(8deg) contrast(1.05) brightness(1.04)",
    label: "Fujifilm",
  },
  y2k: {
    css: "contrast(1.2) saturate(0.9) brightness(1.15) blur(0.4px)",
    label: "Y2K Cam",
  },
};

/* ─────────────────────────────────────────
   Layout definitions
───────────────────────────────────────── */
const LAYOUTS = [
  {
    id: "strip4",
    label: "Strip",
    icon: `<div class="layout-icon" style="grid-template-columns:1fr;grid-template-rows:repeat(4,1fr);">
             <div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div>
           </div>`,
  },
  {
    id: "grid2x2",
    label: "2×2",
    icon: `<div class="layout-icon" style="grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;">
             <div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div>
           </div>`,
  },
  {
    id: "filmreel",
    label: "Film Reel",
    icon: `<div class="layout-icon" style="grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr;">
             <div class="cell"></div><div class="cell"></div><div class="cell"></div>
           </div>`,
  },
  {
    id: "polaroid",
    label: "Polaroid",
    icon: `<div class="layout-icon" style="grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;">
             <div class="cell" style="transform:rotate(-4deg);transform-origin:center;"></div>
             <div class="cell" style="transform:rotate(3deg);"></div>
             <div class="cell" style="transform:rotate(2deg);"></div>
             <div class="cell" style="transform:rotate(-2deg);"></div>
           </div>`,
  },
];

/* ─────────────────────────────────────────
   Frame definitions
───────────────────────────────────────── */
const FRAMES = [
  { id: "none", label: "None", thumb: "" },
  {
    id: "frame-classic",
    label: "Classic",
    thumb: "outline:4px solid #f5f0e8;outline-offset:-4px;",
  },
  {
    id: "frame-dark",
    label: "Dark",
    thumb: "outline:4px solid #111;outline-offset:-4px;",
  },
  {
    id: "frame-gold",
    label: "Gold",
    thumb: "outline:4px solid #d4a853;outline-offset:-4px;",
  },
  {
    id: "frame-pink",
    label: "Pink",
    thumb: "outline:4px solid #f4a7c0;outline-offset:-4px;",
  },
  {
    id: "frame-polaroid",
    label: "Polaroid",
    thumb: "outline:4px solid #faf8f2;outline-offset:-4px;margin-bottom:8px;",
  },
  {
    id: "frame-film",
    label: "Film",
    thumb: "box-shadow:4px 0 0 #111,-4px 0 0 #111;",
  },
];

/* ─────────────────────────────────────────
   State
───────────────────────────────────────── */
let currentFilter = "none";
let currentFrame = "none";
let currentLayout = "strip4";
let currentMood = "happy";
let timerSecs = 0;
let photos = []; // { dataUrl } | null
let capturing = false;
let currentShareIdx = null;
let shareFormat = "strip";
let stream = null;

/* ─────────────────────────────────────────
   DOM refs
───────────────────────────────────────── */
const video = document.getElementById("video");
const previewCvs = document.getElementById("canvas-preview");
const previewCtx = previewCvs.getContext("2d");
const countdownEl = document.getElementById("countdown");
const flashEl = document.getElementById("flash");
const stripCvs = document.getElementById("strip-canvas");
const stripCtx = stripCvs.getContext("2d");
const captureBtn = document.getElementById("capture-btn");
const burstBtn = document.getElementById("burst-btn");
const printBtn = document.getElementById("print-btn");
const shareHubBtn = document.getElementById("share-hub-btn");
const clearBtn = document.getElementById("clear-btn");
const filterLabel = document.getElementById("live-filter-label");

/* ─────────────────────────────────────────
   Build layout bars
───────────────────────────────────────── */
function buildLayoutBar(container) {
  container.innerHTML = "";
  LAYOUTS.forEach((l) => {
    const btn = document.createElement("button");
    btn.className = "layout-btn" + (l.id === currentLayout ? " active" : "");
    btn.dataset.layoutId = l.id;
    btn.innerHTML = l.icon + `<span>${l.label}</span>`;
    btn.addEventListener("click", () => setLayout(l.id));
    container.appendChild(btn);
  });
}

["layout-bar-desktop", "layout-bar-mobile"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) buildLayoutBar(el);
});

/* ─────────────────────────────────────────
   Build frame grids
───────────────────────────────────────── */
function buildFrameGrid(container) {
  container.innerHTML = "";
  FRAMES.forEach((f) => {
    const div = document.createElement("div");
    div.className = "frame-thumb" + (f.id === currentFrame ? " active" : "");
    div.dataset.frameId = f.id;
    div.innerHTML = `<div class="frame-thumb-inner" style="${f.thumb}"></div>${f.label}`;
    div.addEventListener("click", () => setFrame(f.id));
    container.appendChild(div);
  });
}

["frames-grid-desktop", "frames-grid-mobile"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) buildFrameGrid(el);
});

/* ─────────────────────────────────────────
   Camera
───────────────────────────────────────── */
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 3840, min: 1280 },
        height: { ideal: 2160, min: 960 },
        facingMode: "user",
      },
      audio: false,
    });
    video.srcObject = stream;
    document.getElementById("startup").style.display = "none";
    captureBtn.disabled = false;
    burstBtn.disabled = false;
  } catch {
    showToast("Camera access denied or unavailable");
  }
}

/* ─────────────────────────────────────────
   Filter
───────────────────────────────────────── */
function setFilter(id, btn) {
  currentFilter = id;
  const f = FILTERS[id] || FILTERS.none;
  video.style.filter = f.css || "";

  // update live label
  if (f.label) {
    filterLabel.textContent = f.label;
    filterLabel.classList.add("visible");
  } else {
    filterLabel.classList.remove("visible");
  }

  document
    .querySelectorAll(".filter-btn")
    .forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  refreshStripPreview();
}

/* ─────────────────────────────────────────
   Layout
───────────────────────────────────────── */
function setLayout(id) {
  currentLayout = id;
  document.querySelectorAll(".layout-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.layoutId === id);
  });
  refreshStripPreview();
}

/* ─────────────────────────────────────────
   Frame
───────────────────────────────────────── */
function setFrame(id) {
  currentFrame = id;
  const overlay = document.getElementById("frame-overlay");
  overlay.className = "frame-overlay";
  if (id !== "none") overlay.classList.add(id);

  document.querySelectorAll(".frame-thumb").forEach((b) => {
    b.classList.toggle("active", b.dataset.frameId === id);
  });

  refreshStripPreview();
}

/* ─────────────────────────────────────────
   Mood (applies a combo filter)
───────────────────────────────────────── */
const MOOD_FILTERS = {
  happy: "vivid",
  dreamy: "fade",
  moody: "noir",
  retro: "kodak",
  y2k: "y2k",
};

function setMood(id) {
  currentMood = id;
  document
    .querySelectorAll(".mood")
    .forEach((m) => m.classList.toggle("active", m.title === id));
  const filterId = MOOD_FILTERS[id] || "none";
  const btn = document.querySelector(`.filter-btn[data-filter="${filterId}"]`);
  setFilter(filterId, btn);
}

/* ─────────────────────────────────────────
   Timer
───────────────────────────────────────── */
function setTimer(s, btn) {
  timerSecs = s;
  document
    .querySelectorAll(".timer-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

/* ─────────────────────────────────────────
   Capture
───────────────────────────────────────── */
async function capturePhoto() {
  if (capturing || !stream) return;
  capturing = true;
  captureBtn.disabled = burstBtn.disabled = true;
  if (timerSecs > 0) await countdown(timerSecs);
  doFlash();
  addPhoto(grabFrame());
  await sleep(180);
  capturing = false;
  captureBtn.disabled = burstBtn.disabled = false;
}

async function startBurst() {
  if (capturing || !stream) return;
  capturing = true;
  captureBtn.disabled = burstBtn.disabled = true;
  if (timerSecs > 0) await countdown(timerSecs);
  for (let i = 0; i < 4; i++) {
    doFlash();
    addPhoto(grabFrame());
    if (i < 3) await sleep(720);
  }
  await sleep(180);
  capturing = false;
  captureBtn.disabled = burstBtn.disabled = false;
}

async function countdown(secs) {
  countdownEl.style.opacity = "1";
  for (let i = secs; i >= 1; i--) {
    countdownEl.textContent = i;
    await sleep(1000);
  }
  countdownEl.style.opacity = "0";
}

function doFlash() {
  flashEl.classList.remove("active");
  void flashEl.offsetWidth;
  flashEl.classList.add("active");
}

/* ─────────────────────────────────────────
   Grab frame
───────────────────────────────────────── */
function grabFrame() {
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 960;
  previewCvs.width = w;
  previewCvs.height = h;

  const f = FILTERS[currentFilter] || FILTERS.none;
  previewCtx.filter = f.css || "none";
  previewCtx.drawImage(video, 0, 0, w, h);
  previewCtx.filter = "none";

  paintFrame(previewCtx, w, h, currentFrame);
  return previewCvs.toDataURL("image/png");
}

/* ─────────────────────────────────────────
   Paint frame onto canvas
───────────────────────────────────────── */
function paintFrame(c, w, h, frame) {
  if (!frame || frame === "none") return;

  if (frame === "frame-classic") {
    c.strokeStyle = "#f5f0e8";
    c.lineWidth = 28;
    c.strokeRect(14, 14, w - 28, h - 28);
    c.strokeStyle = "#d4c9a8";
    c.lineWidth = 2;
    c.strokeRect(28, 28, w - 56, h - 56);
  }
  if (frame === "frame-dark") {
    c.strokeStyle = "#0a0a0a";
    c.lineWidth = 24;
    c.strokeRect(12, 12, w - 24, h - 24);
  }
  if (frame === "frame-gold") {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#8b6914");
    g.addColorStop(0.35, "#d4a853");
    g.addColorStop(0.65, "#f0c96a");
    g.addColorStop(1, "#8b6914");
    c.strokeStyle = g;
    c.lineWidth = 20;
    c.strokeRect(10, 10, w - 20, h - 20);
  }
  if (frame === "frame-pink") {
    c.strokeStyle = "#f9cad8";
    c.lineWidth = 22;
    c.strokeRect(11, 11, w - 22, h - 22);
    c.strokeStyle = "#f4a7c0";
    c.lineWidth = 2;
    c.strokeRect(22, 22, w - 44, h - 44);
  }
  if (frame === "frame-polaroid") {
    c.fillStyle = "#faf8f2";
    c.fillRect(0, 0, w, 16);
    c.fillRect(0, 0, 16, h);
    c.fillRect(w - 16, 0, 16, h);
    c.fillRect(0, h - 56, w, 56);
  }
  if (frame === "frame-film") {
    c.fillStyle = "#111";
    c.fillRect(0, 0, 18, h);
    c.fillRect(w - 18, 0, 18, h);
    c.fillStyle = "#222";
    for (let y = 12; y < h; y += 24) {
      c.fillRect(4, y, 10, 12);
      c.fillRect(w - 14, y, 10, 12);
    }
  }
}

/* ─────────────────────────────────────────
   Compose strip canvas — all layouts
───────────────────────────────────────── */
function composeStrip(cvs, ctx2, alive, layout, forShare) {
  if (alive.length === 0) return;

  const pad = 20;
  const gap = 10;
  const bg = "#0e0b10";
  const labelH = forShare ? 44 : 0;

  if (layout === "strip4" || alive.length < 3) {
    /* vertical strip — hard cap at 4 photos */
    const stripPhotos = alive.slice(0, 4);
    const iw = 420,
      ih = Math.round((420 * 3) / 4);
    const totalH =
      labelH +
      pad * 2 +
      stripPhotos.length * ih +
      (stripPhotos.length - 1) * gap;
    cvs.width = iw + pad * 2;
    cvs.height = totalH;
    ctx2.fillStyle = bg;
    ctx2.fillRect(0, 0, cvs.width, cvs.height);
    if (forShare) drawStripHeader(ctx2, cvs.width, labelH);
    stripPhotos.forEach((p, i) => {
      const img = new Image();
      img.src = p.dataUrl;
      const y = labelH + pad + i * (ih + gap);
      ctx2.drawImage(img, pad, y, iw, ih);
    });
    if (forShare) drawStripFooter(ctx2, cvs.width, cvs.height);
  } else if (layout === "grid2x2") {
    /* 2x2 instagram grid */
    const iw = 300,
      ih = 300;
    const cols = 2,
      rows = Math.ceil(alive.length / 2);
    cvs.width = cols * iw + (cols + 1) * gap;
    cvs.height = labelH + rows * ih + (rows + 1) * gap;
    ctx2.fillStyle = bg;
    ctx2.fillRect(0, 0, cvs.width, cvs.height);
    if (forShare) drawStripHeader(ctx2, cvs.width, labelH);
    alive.forEach((p, i) => {
      const col = i % 2,
        row = Math.floor(i / 2);
      const x = gap + col * (iw + gap);
      const y = labelH + gap + row * (ih + gap);
      const img = new Image();
      img.src = p.dataUrl;
      /* crop to square */
      const s = Math.min(img.naturalWidth || 1280, img.naturalHeight || 960);
      const sx = ((img.naturalWidth || 1280) - s) / 2;
      const sy = ((img.naturalHeight || 960) - s) / 2;
      ctx2.drawImage(img, sx, sy, s, s, x, y, iw, ih);
    });
  } else if (layout === "filmreel") {
    /* horizontal film reel */
    const ih = 260,
      iw = Math.round((260 * 4) / 3);
    const sprocketH = 28;
    cvs.width = labelH + alive.length * (iw + gap) + gap;
    cvs.height = ih + sprocketH * 2 + pad;
    ctx2.fillStyle = "#111";
    ctx2.fillRect(0, 0, cvs.width, cvs.height);
    /* sprocket holes */
    ctx2.fillStyle = "#222";
    for (let x = 12; x < cvs.width; x += 24) {
      ctx2.fillRect(x, 6, 12, 14);
      ctx2.fillRect(x, cvs.height - 20, 12, 14);
    }
    /* photos */
    alive.forEach((p, i) => {
      const x = gap + i * (iw + gap);
      const img = new Image();
      img.src = p.dataUrl;
      ctx2.drawImage(img, x, sprocketH, iw, ih);
    });
    /* label */
    if (forShare) {
      ctx2.fillStyle = "#f4a7c0";
      ctx2.font = 'italic 13px "Playfair Display", serif';
      ctx2.textAlign = "left";
      ctx2.fillText("bilderbox", 10, cvs.height - 7);
    }
  } else if (layout === "polaroid") {
    /* polaroid scattered layout */
    const iw = 240,
      ih = 240,
      polPad = 14,
      polBot = 48;
    const cols = 2;
    const rows = Math.ceil(alive.length / cols);
    const gutter = 30;
    cvs.width = cols * (iw + polPad * 2) + (cols + 1) * gutter + 60;
    cvs.height =
      labelH + rows * (ih + polPad + polBot) + (rows - 1) * gutter + 60;
    ctx2.fillStyle = "#1a0f20";
    ctx2.fillRect(0, 0, cvs.width, cvs.height);
    if (forShare) drawStripHeader(ctx2, cvs.width, labelH);

    const rotations = [-5, 4, -3, 6, -2, 5];
    alive.forEach((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cardW = iw + polPad * 2;
      const cardH = ih + polPad + polBot;
      const cx = gutter + col * (cardW + gutter) + cardW / 2 + 20;
      const cy = labelH + gutter + row * (cardH + gutter) + cardH / 2 + 20;
      const rot = ((rotations[i % rotations.length] || 0) * Math.PI) / 180;

      ctx2.save();
      ctx2.translate(cx, cy);
      ctx2.rotate(rot);
      /* shadow */
      ctx2.shadowColor = "rgba(0,0,0,0.5)";
      ctx2.shadowBlur = 18;
      /* polaroid card */
      ctx2.fillStyle = "#faf8f2";
      ctx2.beginPath();
      roundRect(ctx2, -cardW / 2, -cardH / 2, cardW, cardH, 3);
      ctx2.fill();
      ctx2.shadowBlur = 0;
      /* photo */
      const img = new Image();
      img.src = p.dataUrl;
      ctx2.drawImage(img, -iw / 2, -cardH / 2 + polPad, iw, ih);
      /* cute date text */
      ctx2.fillStyle = "#888";
      ctx2.font = "10px monospace";
      ctx2.textAlign = "center";
      ctx2.fillText(new Date().toLocaleDateString("en-GB"), 0, cardH / 2 - 14);
      ctx2.restore();
    });
  }
}

function roundRect(ctx2, x, y, w, h, r) {
  ctx2.moveTo(x + r, y);
  ctx2.lineTo(x + w - r, y);
  ctx2.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx2.lineTo(x + w, y + h - r);
  ctx2.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx2.lineTo(x + r, y + h);
  ctx2.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx2.lineTo(x, y + r);
  ctx2.quadraticCurveTo(x, y, x + r, y);
  ctx2.closePath();
}

function drawStripHeader(ctx2, w, labelH) {
  ctx2.fillStyle = "#f4a7c0";
  ctx2.font = 'italic bold 18px "Playfair Display", serif';
  ctx2.textAlign = "center";
  ctx2.fillText("bilderbox", w / 2, labelH - 10);
}

function drawStripFooter(ctx2, w, h) {
  ctx2.fillStyle = "#5e5070";
  ctx2.font = '10px "DM Mono", monospace';
  ctx2.textAlign = "center";
  ctx2.fillText(new Date().toLocaleDateString("en-GB"), w / 2, h - 8);
}

/* ─────────────────────────────────────────
   Strip preview (live, shown when picking frame)
───────────────────────────────────────── */
function refreshStripPreview() {
  ["strip-preview-canvas-desktop", "strip-preview-canvas-mobile"].forEach(
    (id) => {
      const cvs = document.getElementById(id);
      if (!cvs) return;
      const ctx2 = cvs.getContext("2d");
      const alive = photos.filter((p) => p !== null);

      if (alive.length === 0) {
        /* draw placeholder */
        const w = 460,
          h = 200;
        cvs.width = w;
        cvs.height = h;
        ctx2.fillStyle = "#1e1525";
        ctx2.fillRect(0, 0, w, h);
        ctx2.fillStyle = "#5e5070";
        ctx2.font = '12px "DM Mono", monospace';
        ctx2.textAlign = "center";
        ctx2.fillText("take some photos to see a preview", w / 2, h / 2);
        return;
      }

      /* draw preview with current layout */
      composeStrip(cvs, ctx2, alive, currentLayout, true);
      /* scale canvas display */
      cvs.style.width = "100%";
      cvs.style.height = "auto";
    },
  );
}

/* ─────────────────────────────────────────
   Photo management
───────────────────────────────────────── */
function addPhoto(dataUrl) {
  const alive = photos.filter((p) => p !== null);
  if (currentLayout === "strip4" && alive.length >= 4) {
    showToast("Strip is full — switch to grid or film reel for more photos");
    return;
  }
  const idx = photos.length;
  photos.push({ dataUrl });
  updateCount();
  ["strip-wrap-desktop", "strip-wrap-mobile"].forEach((wrapId) => {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    const empties = wrap.querySelectorAll(".strip-empty");
    empties.forEach((e) => (e.style.display = "none"));
    wrap.appendChild(buildStripItem(dataUrl, idx));
    wrap.lastChild.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  printBtn.disabled = false;
  shareHubBtn.disabled = false;
  clearBtn.disabled = false;

  refreshStripPreview();
}

function buildStripItem(dataUrl, idx) {
  const item = document.createElement("div");
  item.className = "strip-item";
  item.dataset.idx = idx;

  const img = document.createElement("img");
  img.src = dataUrl;
  img.alt = "Photo " + (idx + 1);

  const actions = document.createElement("div");
  actions.className = "strip-actions";
  [
    { label: "View", fn: () => openPhotoModal(idx), danger: false },
    { label: "Save", fn: () => downloadPhotoIdx(idx), danger: false },
    { label: "Delete", fn: () => deletePhoto(idx), danger: true },
  ].forEach((b) => {
    const btn = document.createElement("button");
    btn.className = "strip-action-btn";
    btn.textContent = b.label;
    if (b.danger) btn.style.borderColor = "rgba(200,75,58,0.5)";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      b.fn();
    });
    actions.appendChild(btn);
  });

  item.appendChild(img);
  item.appendChild(actions);
  return item;
}

function deletePhoto(idx) {
  photos[idx] = null;
  document
    .querySelectorAll(`.strip-item[data-idx="${idx}"]`)
    .forEach((el) => el.remove());
  updateCount();
  const alive = photos.filter((p) => p !== null);
  if (alive.length === 0) {
    printBtn.disabled = shareHubBtn.disabled = clearBtn.disabled = true;
    document
      .querySelectorAll(".strip-empty")
      .forEach((e) => (e.style.display = "block"));
  }
  refreshStripPreview();
}

function clearAll() {
  photos = [];
  document.querySelectorAll(".strip-item").forEach((el) => el.remove());
  document
    .querySelectorAll(".strip-empty")
    .forEach((e) => (e.style.display = "block"));
  updateCount();
  printBtn.disabled = shareHubBtn.disabled = clearBtn.disabled = true;
  refreshStripPreview();
}

function updateCount() {
  const n = photos.filter((p) => p !== null).length;
  const label = "(" + n + ")";
  ["photo-count-d", "photo-count-m"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = label;
  });
}

/* ─────────────────────────────────────────
   Download strip
───────────────────────────────────────── */
function downloadStrip() {
  const alive = photos.filter((p) => p !== null);
  if (!alive.length) return;
  composeStrip(stripCvs, stripCtx, alive, currentLayout, true);
  /* wait for images to load in next frame */
  setTimeout(() => {
    triggerDownload(
      stripCvs.toDataURL("image/jpeg", 0.95),
      "bilderbox-strip-" + Date.now() + ".jpg",
    );
    showToast("Strip saved!");
  }, 300);
}

/* ─────────────────────────────────────────
   Share hub
───────────────────────────────────────── */
function openShareHub() {
  const alive = photos.filter((p) => p !== null);
  if (!alive.length) return;
  document.getElementById("qr-section").style.display = "none";
  setShareFormat("strip", document.querySelector(".share-layout-btn"));
  buildSharePreview();
  document.getElementById("share-modal").classList.add("open");
}

function setShareFormat(fmt, btn) {
  shareFormat = fmt;
  document
    .querySelectorAll(".share-layout-btn")
    .forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  buildSharePreview();
}

function buildSharePreview() {
  const alive = photos.filter((p) => p !== null);
  if (!alive.length) return;

  const cvs = document.getElementById("share-preview-canvas");
  const ctx2 = cvs.getContext("2d");

  if (shareFormat === "reel") {
    /* 9:16 reel/story canvas */
    const sw = 480,
      sh = Math.round((480 * 16) / 9);
    cvs.width = sw;
    cvs.height = sh;
    ctx2.fillStyle = "#0e0b10";
    ctx2.fillRect(0, 0, sw, sh);

    /* header */
    ctx2.fillStyle = "#f4a7c0";
    ctx2.font = 'italic bold 22px "Playfair Display", serif';
    ctx2.textAlign = "center";
    ctx2.fillText("bilderbox", sw / 2, 44);

    /* stack photos vertically */
    const iw = sw - 40,
      ih = Math.round((iw * 3) / 4);
    const totalImgH = alive.slice(0, 4).length * (ih + 12);
    let startY = (sh - totalImgH) / 2;
    alive.slice(0, 4).forEach((p, i) => {
      const img = new Image();
      img.src = p.dataUrl;
      ctx2.drawImage(img, 20, startY + i * (ih + 12), iw, ih);
    });

    drawStripFooter(ctx2, sw, sh);
  } else if (shareFormat === "grid") {
    /* 1:1 grid */
    const sz = 480;
    cvs.width = sz;
    cvs.height = sz;
    ctx2.fillStyle = "#0e0b10";
    ctx2.fillRect(0, 0, sz, sz);
    const pad = 8;
    const cols = 2,
      iw = (sz - pad * 3) / 2,
      ih = iw;
    alive.slice(0, 4).forEach((p, i) => {
      const col = i % 2,
        row = Math.floor(i / 2);
      const img = new Image();
      img.src = p.dataUrl;
      const s = Math.min(img.naturalWidth || 1280, img.naturalHeight || 960);
      const sx = ((img.naturalWidth || 1280) - s) / 2;
      const sy = ((img.naturalHeight || 960) - s) / 2;
      ctx2.drawImage(
        img,
        sx,
        sy,
        s,
        s,
        pad + col * (iw + pad),
        pad + row * (ih + pad),
        iw,
        ih,
      );
    });
  } else {
    composeStrip(cvs, ctx2, alive, currentLayout, true);
  }

  cvs.style.width = "100%";
  cvs.style.height = "auto";
}

/* ─────────────────────────────────────────
   Share actions
───────────────────────────────────────── */
async function shareToInstagram() {
  /* Instagram doesn't support deep-link sharing from web — we download then prompt */
  await downloadShareImage();
  showToast("Photo saved — open Instagram and share from camera roll!");
}

async function shareNative() {
  const cvs = document.getElementById("share-preview-canvas");
  if (!navigator.share) {
    await downloadShareImage();
    return;
  }
  try {
    const blob = await canvasToBlob(cvs);
    const file = new File([blob], "bilderbox.jpg", { type: "image/jpeg" });
    await navigator.share({ files: [file], title: "bilderbox photobooth" });
  } catch {
    showToast("Share cancelled");
  }
}

async function shareNativeSingle() {
  if (currentShareIdx === null) return;
  const p = photos[currentShareIdx];
  if (!p || !navigator.share) {
    downloadSingle();
    return;
  }
  try {
    const blob = await (await fetch(p.dataUrl)).blob();
    const file = new File([blob], "bilderbox.jpg", { type: "image/jpeg" });
    await navigator.share({ files: [file], title: "bilderbox photobooth" });
  } catch {
    showToast("Share cancelled");
  }
}

async function downloadShareImage() {
  const cvs = document.getElementById("share-preview-canvas");
  setTimeout(() => {
    triggerDownload(
      cvs.toDataURL("image/jpeg", 0.95),
      "bilderbox-" + Date.now() + ".jpg",
    );
    showToast("Saved!");
  }, 200);
}

/* ─── QR Code ─── */
function showQR() {
  const qrSection = document.getElementById("qr-section");
  const qrWrap = document.getElementById("qr-code-wrap");

  qrSection.style.display = "flex";
  qrWrap.innerHTML = "";

  /* encode the share image as a data URL embedded page — or just the origin */
  const alive = photos.filter((p) => p !== null);
  if (!alive.length) {
    showToast("No photos yet");
    return;
  }

  /* build a tiny local blob page with the strip image inside */
  const cvs = document.getElementById("share-preview-canvas");
  const imgSrc = cvs.toDataURL("image/jpeg", 0.88);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>bilderbox</title><style>body{margin:0;background:#0e0b10;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:1rem;font-family:sans-serif}img{max-width:96vw;border-radius:8px}p{color:#f4a7c0;font-size:13px;letter-spacing:.1em}</style></head><body><p>bilderbox</p><img src="${imgSrc}"><a href="${imgSrc}" download="bilderbox.jpg" style="color:#f4a7c0;font-size:12px;">tap & hold to save</a></body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  if (window.QRCode) {
    new QRCode(qrWrap, {
      text: url,
      width: 180,
      height: 180,
      colorDark: "#f4a7c0",
      colorLight: "#0e0b10",
      correctLevel: QRCode.CorrectLevel.M,
    });
  } else {
    qrWrap.textContent = "QR library not loaded";
  }

  qrSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ─────────────────────────────────────────
   Single photo modal
───────────────────────────────────────── */
function openPhotoModal(idx) {
  const p = photos[idx];
  if (!p) return;
  currentShareIdx = idx;
  document.getElementById("modal-img").src = p.dataUrl;
  document.getElementById("photo-modal").classList.add("open");
}

function downloadSingle() {
  if (currentShareIdx === null) return;
  const p = photos[currentShareIdx];
  if (p) triggerDownload(p.dataUrl, "bilderbox-" + Date.now() + ".jpg");
  closeModal("photo-modal");
  showToast("Photo saved!");
}

function deleteCurrent() {
  if (currentShareIdx === null) return;
  deletePhoto(currentShareIdx);
  closeModal("photo-modal");
}

/* ─────────────────────────────────────────
   Download strip
───────────────────────────────────────── */
function downloadPhotoIdx(idx) {
  const p = photos[idx];
  if (!p) return;
  triggerDownload(p.dataUrl, "bilderbox-" + Date.now() + ".jpg");
  showToast("Photo saved!");
}

/* ─────────────────────────────────────────
   Modals
───────────────────────────────────────── */
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
  if (id === "photo-modal") currentShareIdx = null;
}

document.querySelectorAll(".modal-bg").forEach((bg) => {
  bg.addEventListener("click", function (e) {
    if (e.target === this) this.classList.remove("open");
  });
});

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function triggerDownload(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function canvasToBlob(cvs) {
  return new Promise((resolve) => cvs.toBlob(resolve, "image/jpeg", 0.92));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ─────────────────────────────────────────
   Toast
───────────────────────────────────────── */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ─── init strip previews ─── */
refreshStripPreview();
