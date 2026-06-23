// Compress every screenshot to WebP (low space) and emit public/shots.json.
// Originals on E: are read-only here; we only ever write into public/.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SOURCES = ["E:/shotbank/beauty of", "E:/shotbank/pather pachali (1955)"];
const OUT_DIR = "D:/shotbank-inspo/docs";
const SHOTS_DIR = path.join(OUT_DIR, "shots");
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const films = {};
const shots = [];
let bytes = 0;

for (const dir of SOURCES) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "metadata.json"), "utf8"));
  const fslug = slug(meta.title);
  films[fslug] = {
    title: meta.title,
    director: meta.director || "",
    year: meta.year || "",
    source: meta.source || "",
  };
  const byFile = Object.fromEntries((meta.shots || []).map((s) => [s.fileName, s]));
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png")).sort();

  for (const f of files) {
    const base = f.replace(/\.png$/i, "");
    const out = `${fslug}__${base}.webp`;
    await sharp(path.join(dir, f)).webp({ quality: 72, effort: 5 }).toFile(path.join(SHOTS_DIR, out));
    bytes += fs.statSync(path.join(SHOTS_DIR, out)).size;
    const m = byFile[f] || {};
    shots.push({
      id: m.id || out,
      img: `shots/${out}`,
      film: fslug,
      capturedAt: m.capturedAt || "",
      rating: m.rating ?? 0,
      tags: (m.tags || "").trim(),
      notes: (m.notes || "").trim(),
      recreate: (m.recreateNotes || "").trim(),
    });
  }
  process.stdout.write(`packed ${files.length} from ${meta.title}\n`);
}

fs.writeFileSync(path.join(OUT_DIR, "shots.json"), JSON.stringify({ films, shots }, null, 0));
console.log(`\n${shots.length} shots, ${(bytes / 1024 / 1024).toFixed(1)} MB of webp`);
