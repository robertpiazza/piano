// Convert a four-part hymn (parsed LilyPond) into Carol Keys format:
// right hand = soprano melody, left hand = chord names derived from all four voices.
const { readLy } = require('./ly.cjs');

const SHARP_KEYS = new Set(['G', 'D', 'A', 'E', 'B', 'Em', 'Bm', 'F#m']);
function spellTable(key) {
  const t = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
  if (SHARP_KEYS.has(key)) { t[3] = 'D#'; }
  if (key === 'G' || key === 'Em') { t[10] = 'A#'; }
  if (key === 'D' || key === 'A' || key === 'E' || key === 'Bm') { t[10] = 'A#'; }
  return t;
}
function noteName(m, key) { return spellTable(key)[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
const fmt = d => { const s = (+d.toFixed(4)).toString(); return s.startsWith('0.') ? s.slice(1) : s; };

const TEMPL = { '': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'dim': [0, 3, 6] };
const PCN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function priorOf(key, r, q) {
  const minor = key.endsWith('m'); const tonic = PCN[key[0]] + (key[1] === '#' ? 1 : key[1] === 'b' ? -1 : 0);
  const deg = ((r - tonic) % 12 + 12) % 12;
  const P = minor
    ? { '0m': .25, '5m': .15, '7': .15, '77': .17, '7m': .05, '3': .12, '8': .1, '10': .1, '5': .02, '2dim': 0 }
    : { '0': .25, '5': .2, '7': .2, '77': .18, '9m': .1, '2m': .08, '27': .02, '4m': 0, '11dim': 0 };
  const k = deg + q;
  return k in P ? P[k] : -0.15;
}
function bestChord(w, bassPc, total, key, melPc) {
  let best = null;
  for (let r = 0; r < 12; r++) for (const [q, iv] of Object.entries(TEMPL)) {
    const pcs = iv.map(x => (r + x) % 12);
    let s = 0; for (let pc = 0; pc < 12; pc++) s += pcs.includes(pc) ? w[pc] : -0.7 * w[pc];
    if (bassPc === r) s += 0.35 * total; else if (pcs.includes(bassPc)) s += 0.08 * total;
    if (q === '7') { if (w[(r + 10) % 12] < 0.12 * total) s -= 1; s -= 0.04 * total; }
    if (q === 'dim') s -= 0.15 * total;
    if (q === 'm') s -= 0.01 * total;
    s += priorOf(key, r, q) * total;
    if (melPc != null && pcs.includes(melPc)) s += 0.15 * total;
    if (!best || s > best.s) best = { s, r, q };
  }
  if (!best || total === 0) return null;
  return spellTable(key)[best.r] + best.q;
}

function convert(opts) {
  const src = readLy(opts.file, opts.voices || { s: 'melody', a: 'alto', t: 'tenor', b: 'bass' });
  const scale = opts.timeScale || 1;
  const tr = opts.transpose || 0;
  const time = opts.time || src.time;
  const bpb = time[0] * 4 / time[1];
  const pickup = (src.partial || 0) * scale;
  const key = opts.key;
  const V = {};
  for (const [k, v] of Object.entries(src.voices)) V[k] = v.notes.map(n => ({ midi: n.midi + tr, start: n.start * scale, dur: n.dur * scale }));
  // melody: top note at each onset
  const mel = []; const byStart = {};
  for (const n of V.s) { const k = n.start.toFixed(4); if (!byStart[k] || byStart[k].midi < n.midi) byStart[k] = n; }
  Object.values(byStart).sort((a, b) => a.start - b.start).forEach(n => mel.push(n));
  const length = Math.max(...Object.values(V).map(v => Math.max(...v.map(n => n.start + n.dur))));
  const isBar = t => Math.abs(((t - pickup) / bpb) - Math.round((t - pickup) / bpb)) < 1e-6 && t > 1e-6 && t < length - 1e-6;
  // right hand tokens
  const rh = []; let t = 0;
  for (const n of mel) {
    if (n.start > t + 1e-6) { if (isBar(t)) rh.push('|'); rh.push('R:' + fmt(n.start - t)); t = n.start; }
    if (isBar(t)) rh.push('|');
    rh.push(noteName(n.midi, key) + ':' + fmt(n.dur)); t = n.start + n.dur;
  }
  if (t < length - 1e-6) rh.push('R:' + fmt(length - t));
  // chord segments
  const unit = opts.harmonicUnit || (bpb >= 4 ? bpb / 2 : bpb);
  const segs = [];
  if (pickup > 0) segs.push([0, pickup]);
  for (let s = pickup; s < length - 1e-6; s += bpb) for (let u = s; u < Math.min(s + bpb, length) - 1e-6; u += unit) segs.push([u, Math.min(u + unit, s + bpb, length)]);
  const all = Object.values(V).flat();
  const chords = segs.map(([a, b]) => {
    const w = new Array(12).fill(0); let total = 0;
    for (const n of all) { const o = Math.min(b, n.start + n.dur) - Math.max(a, n.start); if (o > 1e-6) { const wt = o * (n.start >= a - 1e-6 ? 1.15 : 1); w[n.midi % 12] += wt; total += wt; } }
    const bassNotes = (V.b || []).filter(n => n.start < b - 1e-6 && n.start + n.dur > a + 1e-6).sort((x, y) => x.start - y.start);
    const bassPc = bassNotes.length ? bassNotes[0].midi % 12 : -1;
    const mn = mel.find(n => n.start <= a + 1e-6 && n.start + n.dur > a + 1e-6);
    return { a, b, name: bestChord(w, bassPc, total, key, mn ? mn.midi % 12 : null) };
  });
  (opts.overrides || []).forEach(([idx, name]) => { if (chords[idx]) chords[idx].name = name; });
  // merge identical chords within a bar
  const lh = []; let i = 0;
  while (i < chords.length) {
    const c = chords[i]; let end = c.b; let j = i + 1;
    while (j < chords.length && chords[j].name === c.name && !isBar(chords[j].a)) { end = chords[j].b; j++; }
    if (isBar(c.a)) lh.push('|');
    lh.push((c.name || '-') + ':' + fmt(end - c.a)); i = j;
  }
  return {
    time, bpb, pickup, length,
    rh: rh.join(' ').replace(/ \| /g, ' | '), lh: lh.join(' '),
    range: [Math.min(...mel.map(n => n.midi)), Math.max(...mel.map(n => n.midi))].map(m => noteName(m, key)),
    chordList: chords.map((c, k) => k + ':' + c.name + '@' + c.a).join(' '),
  };
}
module.exports = { convert, noteName };
