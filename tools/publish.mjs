import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const namespace = 'https://blygger.org/ns/0.1';
const alphabet = '0123456789abcdefghjkmnpqrstvwxyz';

function itemId() {
  let value = BigInt('0x' + randomBytes(16).toString('hex'));
  let output = '';
  for (let bit = 0; bit < 26; bit++) {
    output = alphabet[Number(value & 31n)] + output;
    value >>= 5n;
  }
  return output;
}

function text(value) {
  return String(value).replace(/[&<>"']/g, (match) => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  })[match]);
}

async function write(root, relative, body) {
  const file = join(root, relative);
  await mkdir(join(file, '..'), { recursive: true });
  const temporary = `${file}.${randomBytes(5).toString('hex')}.tmp`;
  await writeFile(temporary, body);
  await rename(temporary, file);
}

const json = (value) => JSON.stringify(value, null, 2) + '\n';

export async function publish({ directory, origin, author, photo, caption, alt, respondsTo }) {
  origin = new URL('./', origin.endsWith('/') ? origin : origin + '/').href;
  const manifestPath = join(directory, 'blyg.json');
  const previous = await readFile(manifestPath, 'utf8').then(JSON.parse).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (previous && (previous.site !== origin || previous.author.name !== author)) {
    throw new Error('This publisher directory already belongs to a different origin or byline.');
  }
  const photoBytes = await readFile(photo);
  if (photoBytes[0] !== 0xff || photoBytes[1] !== 0xd8) throw new Error('The demo publisher accepts JPEG photographs.');
  const mediaPath = 'media/' + createHash('sha256').update(photoBytes).digest('hex') + '.jpg';
  const id = itemId();
  const kind = respondsTo ? 'thread' : 'fragment';
  const created = new Date().toISOString();
  const page = `${kind === 'thread' ? 't' : 'f'}/${id}/`;
  const itemPath = `items/${id}.json`;
  const absolute = (path) => new URL(path, origin).href;
  caption = caption.trim().normalize('NFC');
  alt = alt.trim().normalize('NFC');
  if (!caption || /[\r\n\x00-\x1f]/.test(caption + alt)) throw new Error('Use a caption and single-line text.');
  const markdownLiteral = (value) => value.replace(/[\\`*_{}\[\]()<>#.!|]/g, (char) => '\\' + char);
  const content_md = `${markdownLiteral(caption)}\n\n![${markdownLiteral(alt)}](${absolute(mediaPath)})\n`;
  const content_html = `<p>${text(caption)}</p>\n<p><img src="${text(absolute(mediaPath))}" alt="${text(alt)}"></p>\n`;
  const item = {
    blyg: '0.4', id, kind, origin, version: 1, created, updated: created, page,
    content_md, content_html,
    content_hash: 'sha256:' + createHash('sha256').update(content_md).digest('hex'),
    media: [{ url: mediaPath, mime: 'image/jpeg', alt }], author: { name: author },
    changelog: [{ version: 1, at: created }],
    ...(respondsTo ? {
      stub_of: { origin: respondsTo.origin, id: respondsTo.id, version: respondsTo.version },
      transclusions: [],
    } : {}),
  };
  const history = previous ? JSON.parse(await readFile(join(directory, 'items/index.json'), 'utf8')).items : [];
  const manifest = {
    blyg: '0.4', level: 2, site: origin, title: author + ' · Reverse Angle demo',
    author: { name: author }, updated: created,
  };
  const members = [{ id, kind, created, updated: created, version: 1 }, ...history];
  const htmlStart = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="blyg" href="${text(absolute('blyg.json'))}"><link rel="alternate" type="application/rss+xml" href="${text(absolute('feed.xml'))}">
<style>body{background:#f5f1e7;color:#262a22;max-width:52rem;padding:1.8rem;margin:auto;font:17px/1.5 system-ui}img{display:block;width:100%;height:auto}a{color:#395834}small{color:#555e51}</style>`;
  const relation = respondsTo ? `<p><a href="${text(new URL(respondsTo.page || 'items/' + respondsTo.id + '.json', respondsTo.origin))}">Photo reply to ${text(respondsTo.author?.name || 'the original post')}</a></p>` : '';
  await write(directory, mediaPath, photoBytes);
  await write(directory, itemPath, json(item));
  await write(directory, page + 'index.html', htmlStart +
    `<title>${text(author)} · Demo photo</title><link rel="alternate" type="application/json" href="${text(absolute(itemPath))}">
<main><p><a href="${text(origin)}">${text(author)}</a> · <small>Fictional demo publisher · Generated photograph</small></p>${relation}${content_html}</main></html>`);
  await write(directory, 'index.html', htmlStart + `<title>${text(manifest.title)}</title><main><h1>${text(manifest.title)}</h1><p><a href="${text(absolute('feed.xml'))}">RSS feed</a></p><ul>${
    members.map((entry) => `<li><a href="${text(absolute(`${entry.kind === 'thread' ? 't' : 'f'}/${entry.id}/`))}">${text(entry.created)} · ${entry.kind === 'thread' ? 'Photo reply' : 'Photo'}</a></li>`).join('')
  }</ul></main></html>`);
  const feedMembers = await Promise.all(members.slice(0, 50).map(async (entry) => (
    entry.id === id ? item : JSON.parse(await readFile(join(directory, 'items', entry.id + '.json'), 'utf8'))
  )));
  const feed = feedMembers.map((entry) => `<item>
    <guid isPermaLink="false">blyg:${entry.id}:v1</guid><link>${text(absolute(entry.page))}</link>
    <title>${text(entry.content_md.split('\n')[0])}</title><description>${text(entry.content_html)}</description>
    <pubDate>${new Date(entry.created).toUTCString()}</pubDate><blyg:id>${entry.id}</blyg:id>
    <blyg:kind>${entry.kind}</blyg:kind><blyg:version>1</blyg:version><blyg:created>${entry.created}</blyg:created>
    <blyg:item>${text(absolute(`items/${entry.id}.json`))}</blyg:item></item>`).join('\n');
  await write(directory, 'items/index.json', json({ updated: created, items: members }));
  await write(directory, 'feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:blyg="${namespace}"><channel><title>${text(manifest.title)}</title><link>${text(origin)}</link>
<description>Generated photo studies for Reverse Angle</description><lastBuildDate>${new Date(created).toUTCString()}</lastBuildDate>
<blyg:level>2</blyg:level><blyg:manifest>${text(absolute('blyg.json'))}</blyg:manifest>${feed}</channel></rss>\n`);
  await write(directory, 'blyg.json', json(manifest));
  return item;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [directory, origin, author, photo, caption, alt, target] = process.argv.slice(2);
  if (!alt) throw new Error('Usage: node tools/publish.mjs DIRECTORY ORIGIN AUTHOR PHOTO CAPTION ALT [TARGET_ITEM_JSON_URL]');
  const respondsTo = target ? await fetch(target).then((response) => {
    if (!response.ok) throw new Error('Could not read the target item');
    return response.json();
  }) : null;
  const result = await publish({ directory, origin, author, photo, caption, alt, respondsTo });
  process.stdout.write(json(result));
}
