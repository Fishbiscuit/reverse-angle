import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publish } from './publish.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const [base, output] = process.argv.slice(2);
if (!base || !output || !base.endsWith('/')) throw new Error('Usage: node tools/build.mjs PUBLIC_BASE_URL_WITH_TRAILING_SLASH OUTPUT_DIRECTORY');
const url = new URL(base);
if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an HTTP(S) demo URL');
const out = resolve(output);
await mkdir(out, { recursive: true });
if ((await readdir(out)).length) throw new Error('Choose an empty output directory');
for (const file of ['index.html', 'app.js', 'reader.js', 'room.js', 'styles.css', 'vendor']) {
  await cp(join(project, file), join(out, file), { recursive: true });
}
const front = await publish({
  directory: join(out, 'blygs/mira'), origin: new URL('blygs/mira/', base).href, author: 'Mira Tan',
  photo: join(project, 'assets/audience.jpg'), caption: 'Opening night, from the audience.',
  alt: 'Visitors face a hanging screen lit by a sea-green projection.',
});
const reply = await publish({
  directory: join(out, 'blygs/jo'), origin: new URL('blygs/jo/', base).href, author: 'Jo Lim',
  photo: join(project, 'assets/backstage.jpg'), caption: 'Opening night, from behind the screen.',
  alt: 'A technician adjusts a cable behind the same green screen.', respondsTo: front,
});
const location = (item) => `blygs/${item === front ? 'mira' : 'jo'}/items/${item.id}.json`;
await writeFile(join(out, 'scene.json'), JSON.stringify({
  original: location(front),
  reply: location(reply),
  demo: true,
}, null, 2) + '\n');
console.log('Built ' + out + ' for ' + base);
