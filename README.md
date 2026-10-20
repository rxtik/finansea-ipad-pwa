# FinanSEA iPad PWA

This package turns the existing FinanSEA HTML/CSS/JavaScript app into an installable Progressive Web App shell with offline asset caching and a more tablet-friendly layout.

## Files
- `index.html` — app entry point and PWA metadata
- `styles.css` — original styles plus iPad/touch refinements
- `app.js` — existing finance/voyage logic
- `manifest.json` — install and home-screen metadata
- `service-worker.js` — caches the app shell for offline reopening
- `icon.svg` — app icon

## Important: don't open index.html directly
Service workers do not run from `file://`. To install and use this as an offline PWA on iPad, host this folder on an HTTPS static host. A local development server on `localhost` also works for testing on the Mac.

## Test on Mac
From Terminal, navigate into this folder and run:
```sh
python3 -m http.server 8080
```
Then open `http://localhost:8080` in a browser. For testing on an iPad on the same Wi-Fi, use the Mac's local IP address instead of `localhost`; however, iPad service-worker installation normally requires HTTPS, so use an HTTPS host for the real install/offline test.

## Install on iPad
1. Publish the folder to an HTTPS static host (for example, a static-site host).
2. Open the HTTPS URL in Safari on iPad.
3. Load the app once while online and wait for it to finish loading.
4. Use Share → Add to Home Screen.
5. Open FinanSEA from its Home Screen icon, then enable Airplane Mode and test that it still opens.

## Financial data caution
The app's existing entries are stored in browser `localStorage` on that device/browser profile. The service worker caches app files, not financial records. Before switching devices or clearing website data, export or otherwise back up your records. The current uploaded HTML does not expose a visible backup/restore control, so do not assume your records are backed up automatically.
