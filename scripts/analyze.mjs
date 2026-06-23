// Detect YouTube fullscreen overlay via white-text-on-dark edges:
//  - title text top-left ("The Beauty Of Akira Kurosawa")
//  - time text + control icons in the bottom control bar
// White UI text = near-white pixels with a dark neighbor; bright skies lack that
// (uniformly bright, no dark-adjacent edges) so they don't false-trigger.
// ponytail: native-res region sampling + human-verified crop montages.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SOURCES = ["E:/shotbank/beauty of", "E:/shotbank/pather pachali (1955)"];
const OUT = "D:/shotbank-inspo/scripts/_work";
fs.mkdirSync(OUT, { recursive: true });

// fraction of near-white pixels that have a dark pixel within `reach` px horizontally
async function textEdgeFrac(img, region, reach = 4) {
  const { data, info } = await sharp(img).extract(region).removeAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const white = new Uint8Array(w * h), dark = new Uint8Array(w * h);
  for (let i = 0, p = 0; p < w * h; p++, i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    if (mn > 188) white[p] = 1;
    if (mx < 115) dark[p] = 1;
  }
  let n = 0, edge = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!white[y * w + x]) continue;
    n++;
    let hasDark = false;
    for (let d = 1; d <= reach && !hasDark; d++) {
      if (x - d >= 0 && dark[y * w + x - d]) hasDark = true;
      if (x + d < w && dark[y * w + x + d]) hasDark = true;
    }
    if (hasDark) edge++;
  }
  return { whiteFrac: n / (w * h), edgeFrac: n ? edge / n : 0, edgeAbs: edge / (w * h) };
}

// saturated-colour fraction (Windows taskbar icons) in a band
async function colorFrac(file, region) {
  const { data, info } = await sharp(file).extract(region).removeAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  let n = info.width * info.height, sat = 0;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn > 80 && mx > 110) sat++;
  }
  return sat / n;
}

async function features(file) {
  const title = await textEdgeFrac(file, { left: 10, top: 30, width: 380, height: 60 });
  const bottom = await textEdgeFrac(file, { left: 120, top: 735, width: 1126, height: 33 });
  const topbar = await textEdgeFrac(file, { left: 0, top: 0, width: 1366, height: 24 }); // browser tabs/bookmarks
  const taskbar = await colorFrac(file, { left: 0, top: 748, width: 1366, height: 19 }); // win taskbar icons
  const taskbarBase = await colorFrac(file, { left: 0, top: 400, width: 1366, height: 19 }); // mid-frame baseline
  return {
    titleEdge: +title.edgeAbs.toFixed(5),
    titleEdgeFrac: +title.edgeFrac.toFixed(3),
    botEdge: +bottom.edgeAbs.toFixed(5),
    topEdge: +topbar.edgeAbs.toFixed(5),
    taskColor: +taskbar.toFixed(4),
    midColor: +taskbarBase.toFixed(4),
  };
}

function isOverlay(f) {
  const titleHit = f.titleEdge > 0.0025 && f.titleEdgeFrac > 0.15; // youtube/bilibili title text
  const botHit = f.botEdge > 0.004;                                // time text / esc banner / controls
  const topHit = f.topEdge > 0.003;                                // browser tab/bookmark bar text
  const taskHit = f.taskColor > 0.04 && f.taskColor > f.midColor * 2.2; // taskbar icon row
  return titleHit || botHit || topHit || taskHit;
}

const all = [];
for (const dir of SOURCES) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "metadata.json"), "utf8"));
  const byFile = Object.fromEntries((meta.shots || []).map((s) => [s.fileName, s]));
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png"));
  for (const f of files) {
    const full = path.join(dir, f);
    const ft = await features(full);
    all.push({ dir, film: meta.title, file: f, full, ...ft, overlay: isOverlay(ft), shot: byFile[f] || null });
  }
  process.stdout.write(`scored ${files.length} from ${meta.title}\n`);
}

all.sort((a, b) => a.film < b.film ? -1 : a.film > b.film ? 1 : (a.file < b.file ? -1 : 1));
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(all, null, 2));

const flagged = all.filter((a) => a.overlay);
console.log(`\nTotal ${all.length}; flagged overlay = ${flagged.length}`);

// Verification montage: for each flagged image, stack its title crop over its
// bottom-bar crop so the actual UI text is legible. Clean shots show no text.
const CW = 440, banner = 18;
async function strip(r) {
  const top = await sharp(r.full).extract({ left: 0, top: 24, width: 1366, height: 78 })
    .resize(CW, 25, { fit: "fill" }).toBuffer();
  const bot = await sharp(r.full).extract({ left: 0, top: 720, width: 1366, height: 48 })
    .resize(CW, 15, { fit: "fill" }).toBuffer();
  return { top, bot };
}
async function montage(list, name) {
  if (!list.length) return;
  const COLS = 3, cellH = banner + 25 + 15 + 4, rows = Math.ceil(list.length / COLS);
  const comps = [];
  for (let i = 0; i < list.length; i++) {
    const r = list[i], cx = (i % COLS) * (CW + 6), cy = Math.floor(i / COLS) * cellH;
    const { top, bot } = await strip(r);
    const idx = all.indexOf(r);
    const svg = Buffer.from(`<svg width="${CW}" height="${banner}"><rect width="100%" height="100%" fill="#102"/>` +
      `<text x="3" y="13" font-family="monospace" font-size="11" fill="#6f6">${idx} ${r.file.slice(13,19)} tE${r.titleEdge} bE${r.botEdge} top${r.topEdge} tsk${r.taskColor}/${r.midColor}</text></svg>`);
    comps.push({ input: svg, left: cx, top: cy });
    comps.push({ input: top, left: cx, top: cy + banner });
    comps.push({ input: bot, left: cx, top: cy + banner + 25 + 2 });
  }
  await sharp({ create: { width: COLS * (CW + 6), height: rows * cellH, channels: 3, background: "#000" } })
    .composite(comps).jpeg({ quality: 82 }).toFile(path.join(OUT, name));
  console.log(`wrote ${name} (${list.length})`);
}
// split flagged montage into pages of 30 for legibility
for (let i = 0, p = 0; i < flagged.length; i += 30, p++)
  await montage(flagged.slice(i, i + 30), `flagged-${p}.jpg`);
// borderline: not flagged but some activity — check for misses
const border = all.filter((a) => !a.overlay &&
  (a.titleEdge > 0.0008 || a.botEdge > 0.002 || a.topEdge > 0.0015 || a.taskColor > 0.025));
await montage(border.slice(0, 45), "border.jpg");
console.log(`borderline (near-miss) candidates: ${border.length}`);

// Full chronological contact sheets as a safety net for total misses.
const COLS = 7, ROWS = 6, PER = COLS * ROWS, TW = 256, TH = 144, PAD = 18, ch = TH + PAD;
for (let p = 0; p * PER < all.length; p++) {
  const slice = all.slice(p * PER, p * PER + PER), comps = [];
  for (let i = 0; i < slice.length; i++) {
    const r = slice[i], cx = (i % COLS) * TW, cy = Math.floor(i / COLS) * ch, idx = p * PER + i;
    comps.push({ input: await sharp(r.full).resize(TW, TH, { fit: "fill" }).png().toBuffer(), left: cx, top: cy + PAD });
    comps.push({ input: Buffer.from(`<svg width="${TW}" height="${PAD}"><rect width="100%" height="100%" fill="${r.overlay ? '#600' : '#111'}"/><text x="3" y="13" font-family="monospace" font-size="12" fill="${r.overlay ? '#f88' : '#0f0'}">${idx} ${r.file.slice(13,19)}${r.overlay ? ' CUT' : ''}</text></svg>`), left: cx, top: cy });
  }
  await sharp({ create: { width: COLS * TW, height: ROWS * ch, channels: 3, background: "#000" } })
    .composite(comps).jpeg({ quality: 72 }).toFile(path.join(OUT, `sheet-${String(p).padStart(2, "0")}.jpg`));
}
console.log("wrote full chronological sheets");
