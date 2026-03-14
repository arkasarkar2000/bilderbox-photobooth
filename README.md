# bilderbox

> *dein fotostudio* — your cute analog-style photobooth, right in the browser.

A free, privacy-first photobooth web app with film filters, multiple layouts, and sharing tools. No backend, no accounts, no data collection. Everything runs client-side.

Live: [bilderbox.netlify.app](https://bilderbox.netlify.app) ← update this with your actual URL

---

## Features

- Real-time camera with single shot and burst mode (×4)
- Self-timer — 3s, 5s, 10s countdown
- 11 filters — B&W, Sepia, Vivid, Fade, Noir, Warm, Disposable, Kodak, Fujifilm, Y2K Cam
- 4 strip layouts — Classic strip (4), 2×2 grid (6), Film reel (8), Polaroid scattered (6)
- 7 frames — Classic, Dark, Gold, Pink, Polaroid, Film, None
- Mood presets — happy, dreamy, moody, retro, y2k
- Individual photos saved as JPEG (fast, small); final strip saved as PNG (lossless)
- Timestamp prompt before saving strip
- Strip preview modal after saving
- Share hub — native share, Instagram, QR code, download
- Light / dark mode (persisted via localStorage)
- PWA — installs on any device, works offline after first load
- Zero data collected — photos never leave your device
- Privacy-respecting analytics via Plausible (no cookies, no personal data)

---

## Browser support

| Browser | Support |
|---------|---------|
| Chrome / Edge (desktop + Android) | Full |
| Safari 16.4+ (iOS + macOS) | Full |
| Firefox 90+ | Full |
| Samsung Internet | Full |
| Opera | Full |

Camera access requires HTTPS. Netlify handles this automatically.

---

## Project structure

```
bilderbox/
├── index.html            # main app
├── about.html
├── privacy.html
├── terms.html
├── 404.html
├── manifest.json         # PWA manifest
├── service-worker.js     # offline caching (v3)
├── robots.txt
├── sitemap.xml           # update domain before deploying
├── _headers              # Netlify cache + security headers
├── _redirects            # Netlify 404 rule
├── css/
│   ├── style.css         # main app styles
│   └── pages.css         # legal/info page styles
├── js/
│   └── app.js            # all app logic
└── icons/
    ├── icon.svg
    ├── icon-192.png
    └── icon-512.png
```

---

## Deploy to Netlify

**Via Git (recommended)**

1. Push this repo to GitHub
2. Netlify → Add new site → Import from Git → select repo
3. Build command: *(leave empty)*
4. Publish directory: `.`
5. Deploy

**Via drag and drop**

1. Zip the folder
2. [app.netlify.com/drop](https://app.netlify.com/drop) → drag zip in

---

## Analytics setup (Plausible)

Bilderbox uses [Plausible](https://plausible.io) — a privacy-friendly analytics tool. No cookies, no personal data, GDPR compliant.

1. Create a free account at [plausible.io](https://plausible.io)
2. Add your site domain
3. The script tag is already in `index.html` — just update `data-domain` to match your domain:

```html
<script defer data-domain="YOUR-DOMAIN.netlify.app" src="https://plausible.io/js/script.js"></script>
```

Plausible has a free 30-day trial. After that it's €9/month. If you want completely free analytics, use [Umami](https://umami.is) (self-hosted on Vercel for free) or just remove the script tag entirely.

---

## Before going live checklist

- [ ] Update `data-domain` in the Plausible script tag in `index.html`
- [ ] Update domain in `robots.txt` sitemap URL
- [ ] Update domain in `sitemap.xml`
- [ ] Update live demo URL in this README
- [ ] Test camera on iOS Safari and Android Chrome
- [ ] Test PWA install on both platforms

---

## Tech

Plain HTML, CSS, and JavaScript — no framework, no build step.

Bootstrap 5 · QRCode.js · Google Fonts · Canvas API · MediaDevices API · Web Share API · Service Workers · Plausible Analytics

---

## Privacy

Bilderbox collects no personal data. Photos are processed in browser memory and gone when you close the tab. Plausible analytics collects only aggregate, anonymous page view data — no cookies, no fingerprinting, no personal identifiers.

---

## License

MIT
