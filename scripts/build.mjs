// Builds the site into _site/: inlines VexFlow (sheet music) into src/index.html
// so the page is one self-contained file, then copies public/ alongside it.
// Usage: node scripts/build.mjs [outDir]
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, process.argv[2] || '_site');
const src = readFileSync(join(root, 'src/index.html'), 'utf8');
const vfPath = join(root, 'node_modules/vexflow/build/cjs/vexflow-bravura.js');
let vf;
try { vf = readFileSync(vfPath, 'utf8'); } catch { console.error('VexFlow not found. Run `npm install` first.'); process.exit(1); }
if (!src.includes('<!--VEXFLOW-->')) throw new Error('src/index.html is missing the <!--VEXFLOW--> placeholder');
if (vf.includes('</script')) throw new Error('VexFlow bundle contains </script and cannot be inlined');
const html = src.replace('<!--VEXFLOW-->',
  '<script id="vexflow">/* VexFlow 4.2.5, MIT License, https://github.com/0xfe/vexflow */\n' + vf + '\n</script>');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), html);
for (const f of readdirSync(join(root, 'public'))) copyFileSync(join(root, 'public', f), join(out, f));
console.log(`Built ${join(out, 'index.html')} (${Math.round(html.length / 1024)} KB)`);
