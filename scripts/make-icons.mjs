// Generate PWA icons (cinematic amber mark on near-black). ponytail: one SVG → sizes.
import sharp from "sharp";
const svg = (size, pad) => Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${pad ? 96 : 0}" fill="#0a0a0b"/>
  <g transform="translate(106 150)">
    <rect x="0" y="40" width="300" height="180" rx="18" fill="#141417" stroke="#e5b85c" stroke-width="6"/>
    <path d="M0 92 L300 56 L300 92 L0 128 Z" fill="#e5b85c" transform="translate(0 -36)"/>
    <g fill="#0a0a0b">
      <path d="M30 22 l34 -4 l-20 28 l-34 4 Z"/>
      <path d="M96 14 l34 -4 l-20 28 l-34 4 Z"/>
      <path d="M162 6 l34 -4 l-20 28 l-34 4 Z"/>
      <path d="M228 -2 l34 -4 l-20 28 l-34 4 Z"/>
    </g>
    <circle cx="150" cy="150" r="42" fill="none" stroke="#e5b85c" stroke-width="8"/>
    <path d="M138 128 l34 22 l-34 22 Z" fill="#e5b85c"/>
  </g>
</svg>`);
for (const [name, pad] of [["icon-192.png", true], ["icon-512.png", true], ["icon-maskable.png", false]]) {
  const size = name.includes("192") ? 192 : 512;
  await sharp(svg(size, pad)).resize(size, size).png().toFile(`docs/${name}`);
}
console.log("icons written");
