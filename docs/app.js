// Shotbank — static shot-inspiration browser. No deps, no build.
const $ = (s) => document.querySelector(s);
const star = (n) => "★★★★★☆☆☆☆☆".slice(5 - n, 10 - n);

let DATA = { films: {}, shots: [] };
let view = [];          // currently filtered+ordered shots
let filmFilter = null;  // film slug or null
let q = "";
let lbIndex = -1;

const filmLabel = (slug) => {
  const f = DATA.films[slug]; if (!f) return slug;
  const bits = [f.title, f.director, f.year].filter(Boolean);
  return bits.join(" · ");
};

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function applyFilters() {
  const needle = q.toLowerCase();
  view = DATA.shots.filter((s) => {
    if (filmFilter && s.film !== filmFilter) return false;
    if (!needle) return true;
    return (s.tags + " " + s.notes + " " + s.recreate + " " + filmLabel(s.film))
      .toLowerCase().includes(needle);
  });
  render();
}

function render() {
  const grid = $("#grid");
  $("#count").textContent = `${view.length} of ${DATA.shots.length} shots`;
  if (!view.length) { grid.innerHTML = `<div class="empty">No shots match.</div>`; return; }
  grid.innerHTML = "";
  const frag = document.createDocumentFragment();
  view.forEach((s, i) => {
    const t = document.createElement("div");
    t.className = "tile";
    t.innerHTML =
      `<img loading="lazy" src="${s.img}" alt="" />` +
      `<div class="meta"><span class="film">${DATA.films[s.film]?.title || s.film}</span>` +
      `<span class="stars">${s.rating ? star(s.rating) : ""}</span></div>`;
    t.onclick = () => openLightbox(i);
    frag.appendChild(t);
  });
  grid.appendChild(frag);
}

function buildChips() {
  const chips = $("#chips");
  const mk = (label, slug) => {
    const b = document.createElement("button");
    b.className = "chip" + (filmFilter === slug ? " on" : "");
    b.textContent = label;
    b.onclick = () => { filmFilter = slug; buildChips(); applyFilters(); };
    return b;
  };
  chips.innerHTML = "";
  chips.appendChild(mk(`All (${DATA.shots.length})`, null));
  for (const slug of Object.keys(DATA.films)) {
    const n = DATA.shots.filter((s) => s.film === slug).length;
    chips.appendChild(mk(`${DATA.films[slug].title} (${n})`, slug));
  }
}

// ---- lightbox ----
function openLightbox(i) {
  lbIndex = i;
  const s = view[i];
  $("#lbImg").src = s.img;
  $("#lbFilm").textContent = DATA.films[s.film]?.title || s.film;
  const f = DATA.films[s.film] || {};
  $("#lbSub").textContent = [f.director, f.year, f.source && `via ${f.source}`].filter(Boolean).join(" · ");
  $("#lbStars").textContent = s.rating ? star(s.rating) : "—";
  const setField = (fieldSel, valSel, val, render) => {
    $(fieldSel).style.display = val ? "" : "none";
    if (val) (render || ((v) => $(valSel).textContent = v))(val);
  };
  setField("#lbTagsF", "#lbTags", s.tags, (v) =>
    $("#lbTags").innerHTML = v.split(/[,\s]+/).filter(Boolean).map((t) => `<span class="tag">${t}</span>`).join(""));
  setField("#lbNotesF", "#lbNotes", s.notes);
  setField("#lbRecF", "#lbRec", s.recreate);
  $("#lbOpen").onclick = () => window.open(s.img, "_blank");
  $("#lb").classList.add("open");
}
const closeLb = () => { $("#lb").classList.remove("open"); $("#lbImg").src = ""; lbIndex = -1; };
const step = (d) => { if (!view.length) return; openLightbox((lbIndex + d + view.length) % view.length); };
const randomShot = () => { if (!view.length) return; openLightbox((Math.random() * view.length) | 0); };

$("#inspire").onclick = randomShot;
$("#lbRandom").onclick = randomShot;
$("#lbPrev").onclick = () => step(-1);
$("#lbNext").onclick = () => step(1);
$("#lbClose").onclick = closeLb;
$("#lb").onclick = (e) => { if (e.target.id === "lb" || e.target.classList.contains("stage")) closeLb(); };
$("#search").oninput = (e) => { q = e.target.value; applyFilters(); };

document.onkeydown = (e) => {
  if ($("#lb").classList.contains("open")) {
    if (e.key === "Escape") closeLb();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); step(1); }
    else if (e.key.toLowerCase() === "r") randomShot();
  } else if (e.key.toLowerCase() === "r" && document.activeElement.id !== "search") {
    randomShot();
  }
};

fetch("shots.json").then((r) => r.json()).then((d) => {
  DATA = d;
  buildChips();
  applyFilters();
});
