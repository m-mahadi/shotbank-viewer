# Shotbank — shot inspiration (viewer)

A randomizable, searchable gallery of cinematic reference frames — for finding
inspiration during shoots. Companion **viewer** to the ShotBank desktop capture
app; this repo is the phone/web side and is intentionally kept separate.

- 🎲 **Inspire me** — jump to a random shot, full-screen
- 🔎 Search notes, tags, movie; filter by film
- 🖼️ Lightbox with rating, tags, notes, and "how to recreate"
- 📱 Installable **PWA** — add to your phone's home screen, works offline
- 🪶 Screenshots compressed to WebP (~95% smaller than the source PNGs)

No build step, no framework — static `index.html` + `app.js` + `styles.css`.

## Run locally

```bash
node scripts/serve.cjs   # http://localhost:5180
```

## Add more shots

Point `scripts/build-shots.mjs` at your ShotBank library folders (each holds a
`metadata.json` + screenshots), then:

```bash
npm install            # one-time, installs sharp (used only at build time)
node scripts/build-shots.mjs   # → public/shots/*.webp + public/shots.json
```

`scripts/analyze.mjs` is an optional helper that flags screenshots still
carrying player/OS chrome (YouTube overlay, taskbar) and writes contact sheets
to `scripts/_work/` for review. Curation is otherwise manual.

## Install on a phone

**Web / PWA:** open the deployed URL (GitHub Pages), then **Add to Home
Screen**. After one online visit the service worker caches every shot offline.

**Android APK (fully offline):** download from
[Releases](https://github.com/m-mahadi/shotbank-viewer/releases) — every shot is
bundled inside the app, no network needed.

### Rebuild the APK

`android/` is a minimal WebView wrapper. It bundles `docs/` into the app and
needs only the Android SDK (build-tools 36) + JDK 17:

```bash
cp -r docs/* android/app/src/main/assets/      # bundle the latest shots
cd android && ./gradlew assembleDebug           # → app/build/outputs/apk/debug/app-debug.apk
```

`android/local.properties` must point at your SDK with **forward slashes**
(`sdk.dir=C:/Users/you/AppData/Local/Android/Sdk`).

## Keyboard

`R` random · `←/→` prev/next · `Space` next · `Esc` close
