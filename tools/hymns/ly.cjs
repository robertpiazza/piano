// Minimal LilyPond reader for hymn sources: \relative voices, durations, ties, partial, key, time.
const fs = require('fs');

function stripComments(s) {
  s = s.replace(/%\{[\s\S]*?%\}/g, '');
  return s.split('\n').map(l => { const i = l.indexOf('%'); return i >= 0 ? l.slice(0, i) : l; }).join('\n');
}
function balanced(s, i) { // s[i] === '{'
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '{') depth++;
    else if (s[j] === '}') { depth--; if (depth === 0) return j; }
    else if (s[j] === '"') { j = s.indexOf('"', j + 1); }
  }
  throw new Error('unbalanced');
}
function getVar(src, name) {
  const re = new RegExp('^' + name + '\\s*=', 'm');
  const m = re.exec(src); if (!m) return null;
  const i = src.indexOf('{', m.index);
  return src.slice(m.index + m[0].length, i) + ' ' + src.slice(i + 1, balanced(src, i));
}
function removeMarkup(s) {
  let out = '', i = 0;
  while (i < s.length) {
    const m = /[\^_-]?\\markup\s*/.exec(s.slice(i));
    if (!m) { out += s.slice(i); break; }
    out += s.slice(i, i + m.index);
    let j = i + m.index + m[0].length;
    if (s[j] === '{') j = balanced(s, j) + 1; else { const mm = /^\S+/.exec(s.slice(j)); j += mm ? mm[0].length : 0; }
    i = j;
  }
  return out;
}
const STEP = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };
const PCS = [0, 2, 4, 5, 7, 9, 11];
function accOf(suffix, english) {
  if (!suffix) return 0;
  const map = english
    ? { s: 1, sharp: 1, ss: 2, x: 2, f: -1, flat: -1, ff: -2, is: 1, es: -1 }
    : { is: 1, isis: 2, es: -1, eses: -2, s: -1 };
  if (!(suffix in map)) throw new Error('accidental ' + suffix);
  return map[suffix];
}
function parseVoice(body, english, startTime) {
  body = removeMarkup(body);
  body = body.replace(/<<\s*\{([\s\S]*?)\}\s*\\\\\s*\{[\s\S]*?\}\s*>>/g, ' $1 ');
  body = body.replace(/\\(set|unset)\s+[\w.]+(\s*=\s*(#'?\([^)]*\)|#?"[^"]*"|#\S+|\S+))?/g, ' ');
  body = body.replace(/\\(bar)\s*"[^"]*"/g, ' | ');
  const rel = /\\relative\s+([a-g])([',]*)/.exec(body);
  let prevD = null;
  if (rel) {
    const oct = 3 + (rel[2].match(/'/g) || []).length - (rel[2].match(/,/g) || []).length;
    prevD = oct * 7 + STEP[rel[1]];
    body = body.slice(rel.index + rel[0].length);
  }
  const tokRe = /\\partial\s+(\d+)(\.*)|\\time\s+(\d+)\/(\d+)|\\key\s+([a-g]\w*)\s+\\(major|minor)|\\(tuplet|times)\b|\\[a-zA-Z]+|<([^>]*)>(\d+)?(\.*)|(r|R|s|[a-g](?:isis|eses|sharp|flat|is|es|ss|ff|s|f|x)?)([',]*)(!?\??)(\d+)?(\.*)|~|\||[\[\]()]/g;
  let t = startTime || 0, dur = 1, partial = null, time = null, key = null;
  const notes = [];
  let pendingTie = false, m;
  const durOf = (n, dots) => { let d = 4 / parseInt(n, 10), add = d; for (let k = 0; k < dots.length; k++) { add /= 2; d += add; } return d; };
  const place = (letter, marks, english_) => {
    const s = STEP[letter];
    let d;
    if (prevD == null) d = 3 * 7 + s; // absolute fallback (c = C3)
    else { d = Math.floor(prevD / 7) * 7 + s; while (d - prevD > 3) d -= 7; while (prevD - d > 3) d += 7; }
    d += 7 * ((marks.match(/'/g) || []).length - (marks.match(/,/g) || []).length);
    return d;
  };
  const midiOf = (d, acc) => (Math.floor(d / 7) + 1) * 12 + PCS[d % 7] + acc;
  const addNote = (midis, d) => {
    if (pendingTie) {
      const prev = notes.filter(n => Math.abs(n.start + n.dur - t) < 1e-6 && midis.includes(n.midi));
      if (prev.length) { prev.forEach(n => n.dur += d); midis = midis.filter(x => !prev.some(n => n.midi === x)); }
      pendingTie = false;
    }
    midis.forEach(mm => notes.push({ midi: mm, start: t, dur: d }));
    t += d;
  };
  while ((m = tokRe.exec(body))) {
    const tok = m[0];
    if (m[1]) { partial = durOf(m[1], m[2] || ''); continue; }
    if (m[3]) { time = [+m[3], +m[4]]; continue; }
    if (m[5]) { key = [m[5], m[6]]; continue; }
    if (m[7]) throw new Error('tuplets not supported');
    if (tok.startsWith('\\')) {
      if (tok === '\\rest') { // previous token was a pitched rest: undo the note
        const last = notes.pop(); if (last) { /* time already advanced */ }
      }
      continue;
    }
    if (m[8] !== undefined) { // chord
      if (m[9]) dur = durOf(m[9], m[10] || '');
      const parts = m[8].trim().split(/\s+/); const midis = []; let firstD = null; const save = prevD;
      for (const p of parts) {
        const pm = /^([a-g])(isis|eses|sharp|flat|is|es|ss|ff|s|f|x)?([',]*)/.exec(p); if (!pm) continue;
        const d = place(pm[1], pm[3]); prevD = d; if (firstD == null) firstD = d;
        midis.push(midiOf(d, accOf(pm[2], english)));
      }
      prevD = firstD != null ? firstD : save;
      addNote(midis, dur); continue;
    }
    if (m[11] !== undefined) {
      const name = m[11];
      if (m[14]) dur = durOf(m[14], m[15] || '');
      if (name === 'r' || name === 'R' || name === 's') { t += dur; pendingTie = false; continue; }
      const letter = name[0]; const suffix = name.slice(1);
      const d = place(letter, m[12] || ''); prevD = d;
      addNote([midiOf(d, accOf(suffix, english))], dur);
      continue;
    }
    if (tok === '~') { pendingTie = true; continue; }
  }
  return { notes, length: t, partial, time, key };
}
function readLy(path, names) {
  const raw = stripComments(fs.readFileSync(path, 'utf8'));
  const english = /\\include\s+"english\.ly"/.test(raw) || /\\language\s+"english"/.test(raw);
  const glob = getVar(raw, 'global');
  const g = glob ? parseVoice(glob, english, 0) : {};
  const voices = {};
  for (const [k, varName] of Object.entries(names)) {
    const body = getVar(raw, varName); if (!body) continue;
    // a \partial or \time inside the voice also counts
    const v = parseVoice(body, english, 0);
    voices[k] = v;
  }
  const first = Object.values(voices)[0];
  return {
    english, voices,
    time: g.time || first.time, key: g.key || first.key,
    partial: g.partial != null ? g.partial : first.partial,
  };
}
module.exports = { readLy, parseVoice };
