# bilderbox

> *dein fotostudio* — your cute analog-style photobooth, right in the browser.

A free, privacy-first photobooth web app with film filters, multiple layouts, and sharing tools. No backend, no accounts, no data collection. Everything runs client-side.

<!-- Live demo: [bilderbox.netlify.app](https://bilderbox.netlify.app) -->

---

## Features

- **Real-time camera** with single shot and burst mode (×4)
- **Self-timer** — 3s, 5s, 10s countdown
- **11 filters** — B&W, Sepia, Vivid, Fade, Noir, Warm, Disposable, Kodak, Fujifilm, Y2K Cam
- **4 strip layouts** — Classic strip, 2×2 grid, Film reel, Polaroid scattered
- **7 frames** — Classic, Dark, Gold, Pink, Polaroid, Film, None
- **Mood presets** — happy, dreamy, moody, retro, y2k
- **Live strip preview** when selecting frames
- **Share hub** — download, native share sheet, Instagram, QR code
- **Reel / Story format** (9:16) and square grid (1:1) for social media
- **PWA** — installs on any device, works offline after first load
- **Zero data collected** — photos never leave your device

---

## Project structure

```
bilderbox/
├── index.html            # main app
├── about.html            # about page
├── privacy.html          # privacy policy
├── terms.html            # terms of service
├── 404.html              # custom 404
├── footer.html           # footer reference (content is embedded in index.html)
├── manifest.json         # PWA manifest
├── service-worker.js     # offline caching
├── _redirects            # Netlify 404 redirect rule
├── css/
│   ├── style.css         # main app styles
│   └── pages.css         # shared styles for legal/info pages
├── js/
│   └── app.js            # all app logic
└── icons/
    ├── icon.svg
    ├── icon-192.png
    └── icon-512.png
```

---

## Deploying to Netlify

This is a static site with no build step — just drag and drop.

**Option 1 — Netlify Drop**

1. Zip the project folder
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag the zip in
4. Done

**Option 2 — Git deploy (recommended)**

1. Push this repo to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → Add new site → Import from Git
3. Select your repo
4. Build command: *(leave empty)*
5. Publish directory: `.` (or the folder name if it's a subfolder)
6. Deploy

**Custom domain**

Set your domain in Netlify → Site settings → Domain management. Netlify provides a free TLS certificate automatically.

> Camera access requires `https://` in production. Netlify serves over HTTPS by default so this is handled.

**404 page**

Add a `_redirects` file to your project root with this single line so Netlify serves your custom 404:

```
/*  /404.html  404
```

---

## PWA install

On desktop Chrome/Edge, an "Install app" button appears in the header. On iOS Safari, use Share → Add to Home Screen. Once installed, the app works offline.

---

## Tech

- HTML5, CSS3, Vanilla JS — no framework, no build step
- [Bootstrap 5](https://getbootstrap.com) — responsive grid and layout
- [QRCode.js](https://github.com/davidshimjs/qrcodejs) — QR code generation
- [Google Fonts](https://fonts.google.com) — Playfair Display, DM Mono, DM Sans
- Canvas API — photo capture, filter baking, strip composition
- MediaDevices API — camera access
- Web Share API — native OS share sheet
- Service Workers — PWA offline support

---

## Privacy

Bilderbox collects no data whatsoever. Photos are processed in browser memory and discarded when the tab is closed. See [privacy.html](privacy.html) for the full policy.

---

## License

MIT — do whatever you want with it.

---

*Bilderbox — from German "Bilder" (pictures) + "box".*
