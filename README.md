# Station QR Collection

A static, dependency-free website with **8,289 railway station QR codes (RailOne / UTS)** organised state-wise, with search, click-to-enlarge and per-QR download.

* Home: state cards with station counts
* Global search by station name, code, city or address
* Per-state view with zone filter, lazy-loaded QR thumbnails, enlarge + download (use ‹ › or arrow keys to step through)
* Pure HTML/CSS/JS, relative paths only, so it works from a repo sub-path (`https://<user>.github.io/<repo>/`)

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
   (The repo is roughly 50 MB, well under GitHub's limits. `.nojekyll` is included so Pages serves everything as-is.)
2. In the repo go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Source: Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. After a minute the site is live at `https://<your-username>.github.io/station-qr/`.

## Run locally

Opening `index.html` directly will not work because the browser blocks `fetch()` on `file://`. Use any static server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Layout

```
index.html        page shell
css/style.css     styling
js/app.js         hash-routed app (home, state, search, modal)
data/stations.json  state -> stations (name, code, city, zone, address, qr path, decoded payload)
qr/<state>/<id>.png  QR images (600x600 PNG)
tools/            scripts used to collect the data (not needed for hosting)
```

`data/stations.json` also stores each QR's decoded text payload (`payload`, when it could be decoded), so you can regenerate crisp QRs with any QR library if you prefer.

## Source and notes

QR codes and station data come from [mystationqr.com](https://mystationqr.com/); all credit to the original site. This is an unofficial mirror, not affiliated with Indian Railways, CRIS or RailOne. Check the station name and code before relying on a QR. Data was collected on 2026-11-20 and may go out of date; re-run the scripts in `tools/` to refresh.
