# Station QR Collection

A static, installable website of Indian railway station QR codes (RailOne / UTS), organised state-wise. Search by station name, code or city, filter by railway zone, and use the codes offline after installing the app or downloading them for offline use.

Live site: https://dpradeep42.github.io/station-qr-codes/

It is a Progressive Web App (PWA): you can install it on Android (Chrome) and iPhone/iPad (Safari), and it keeps working without internet once the app shell and the QR codes you need are saved on the device.

* Pure HTML/CSS/JS, relative paths only, so it works from a repo sub-path (`https://<user>.github.io/<repo>/`)
* QR images were re-encoded as 1-bit PNGs (still 600×600, still scannable): **37.35 MB → 11.19 MB** for all 8,289 codes.

## Install the app

### Android (Chrome)

1. Open the site in Chrome.
2. Tap **Install app** in the header (or Chrome’s menu → **Install app** / **Add to Home screen**).
3. Open the app from your home screen. It runs full-screen, without the browser bar.

### iPhone and iPad (Safari)

iOS does not show an install banner like Android. In Safari:

1. Open the site.
2. Tap the **Share** button.
3. Tap **Add to Home Screen**, then **Add**.

The home-screen icon opens the app in standalone mode. Other iOS browsers (including Chrome) cannot add a PWA to the home screen; use Safari.

### After it is installed

The first visit still needs a network connection so the app can load and the service worker can cache the page, styles, and the station list. After that the app opens offline.

QR images are cached as you view them. To take a whole state — or all 8,289 codes (~11 MB) — with you, use **Save this state offline** on a state page, or **Download all for offline** on the home page. A progress bar shows how many images have been saved, and states get an **Available offline** badge when they are complete.

The app asks the browser for persistent storage when you start a download, so the saved codes are less likely to be evicted.

## Host on GitHub Pages

1. Create a new GitHub repository (e.g. `station-qr`) and push the **contents of this folder** to the repo root:
   ```bash
   cd station-qr-site
   git init
   git add -A
   git commit -m "Station QR site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/station-qr.git
   git push -u origin main
   ```
   (The repo is well under GitHub's limits. `.nojekyll` is included so Pages serves everything as-is.)
2. In the repo go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Source: Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. After a minute the site is live at `https://<your-username>.github.io/station-qr/`.

To use it as an installable PWA, serve it over HTTPS (GitHub Pages does this for you). A service worker cannot run from a `file://` page.

## Run locally

Opening `index.html` directly will not work because the browser blocks `fetch()` on `file://`. Use any static server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Localhost is a secure context, so you can also test install and offline behaviour there.

## Layout

```
index.html             page shell (manifest + iOS meta tags)
manifest.webmanifest   PWA manifest (name, icons, standalone display)
sw.js                  service worker (app-shell precache, QR runtime cache)
css/style.css          styling
js/app.js              hash-routed app (home, state, search, modal, PWA UI)
data/stations.json     state -> stations (name, code, city, zone, address, qr path, decoded payload)
qr/<state>/<id>.png    QR images (600×600 1-bit PNG)
icons/                 app icons (192, 512, maskable, Apple touch, favicon)
tools/                 scripts used to collect the data (not needed for hosting)
```

`data/stations.json` also stores each QR's decoded text payload (`payload`, when it could be decoded), so you can regenerate crisp QRs with any QR library if you prefer.

The service worker precaches the app shell and `stations.json` so the app opens offline right away. QR images are stored in a separate cache: viewed images are saved automatically (cache-first), and the download buttons fill the rest in batches. A new app version shows a **Reload** prompt; updating the shell does not wipe already-saved QR images.

## iOS notes

* There is no automatic install prompt; use **Share → Add to Home Screen** in Safari.
* iOS may evict service-worker caches when the device is short on storage, even after the app asks for persistent storage (`navigator.storage.persist()` is often not granted on iOS). If codes disappear, open the app online and download them again.
* Keep the saved set reasonable: the full library is about 11 MB, which is safer than the original 37 MB set, but iOS can still reclaim space.

## Source and notes

QR codes and station data come from [mystationqr.com](https://mystationqr.com/); all credit to the original site. This is an unofficial mirror, not affiliated with Indian Railways, CRIS or RailOne. Check the station name and code before relying on a QR. Data was collected on 2026-11-20 and may go out of date; re-run the scripts in `tools/` to refresh.

Jammu and Kashmir lists 16 stations on the source site, but their state page was broken at collection time, so only 15 stations are included.
