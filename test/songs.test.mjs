// Checks the song library and parsers in the page's core script.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../src/index.html', import.meta.url), 'utf8');
const core = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const ctx = {};
vm.runInNewContext(core + ';this.Core = Core;', ctx);
const Core = ctx.Core;
// Values made inside the vm have their own Array prototype; copy them before deepEqual.
const plain = x => JSON.parse(JSON.stringify(x));

test('every built-in song has bars that line up and hands of equal length', () => {
  assert.ok(Core.SONGS.length >= 18);
  for (const s of Core.SONGS) {
    assert.deepEqual(plain(Core.validate(s)), [], s.title);
  }
});

test('song ids are unique and every song names a key', () => {
  const ids = new Set();
  for (const s of Core.SONGS) {
    assert.ok(!ids.has(s.id), 'duplicate id ' + s.id);
    ids.add(s.id);
    assert.match(s.key, /^[A-G][#b]?m?$/, s.title);
  }
});

test('left-hand chord names win over note names (G7 is a chord, not a note)', () => {
  const l = plain(Core.parsePart('G7:4', 'L', 4, 'full', 0).notes.map(n => n.midi));
  assert.deepEqual(l, [43, 47, 50, 53]);
  const r = plain(Core.parsePart('G4:1', 'R', 4, 'triad', 0).notes.map(n => n.midi));
  assert.deepEqual(r, [67]);
});

test('triad style drops the 7th; root style keeps one note', () => {
  assert.deepEqual(plain(Core.chordMidis('D7', 'triad')), [50, 54, 57]);
  assert.deepEqual(plain(Core.chordMidis('Am', 'root')), [45]);
});

test('typed songs round-trip through the text format', () => {
  const s = Core.SONGS.find(x => x.id === 'joy');
  const def = Core.parseSongText(Core.songToText(s));
  assert.deepEqual(plain(Core.validate(def)), []);
  assert.equal(def.key, 'C');
});

test('spelling follows the key', () => {
  assert.equal(Core.spellName(70, 'F'), 'Bb4');
  assert.equal(Core.spellName(63, 'Em'), 'D#4');
  assert.equal(Core.spellName(66, 'C'), 'F#4');
});

test('MIDI files are read and split into hands', () => {
  const bytes = [];
  const u32 = n => [n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255];
  const trk = ev => [...Buffer.from('MTrk'), ...u32(ev.length + 4), ...ev, 0, 0xff, 0x2f, 0];
  const t1 = trk([0, 0x90, 64, 90, 0x83, 0x60, 0x80, 64, 0]);   // E4 for 480 ticks
  const t2 = trk([0, 0x91, 48, 80, 0x8b, 0x20, 0x81, 48, 0]);   // C3 for 1440 ticks
  bytes.push(...Buffer.from('MThd'), ...u32(6), 0, 1, 0, 2, 0x01, 0xe0, ...t1, ...t2);
  const buf = new Uint8Array(bytes).buffer;
  const def = Core.midiToDef(Core.parseMidi(buf), 'test.mid');
  assert.deepEqual(plain(def.notes.map(n => [n[0], n[3]])), [[64, 'R'], [48, 'L']]);
  assert.equal(def.notes[1][2], 3);
});
