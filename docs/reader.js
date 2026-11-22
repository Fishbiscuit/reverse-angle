const idPattern = /^[0-7][0-9a-hjkmnp-tv-z]{25}$/;

export function publicUrl(value, base = location.href) {
  const url = new URL(value, base);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Use a public HTTP(S) link.');
  }
  return url;
}

async function get(url) {
  const response = await fetch(url, { cache:'no-store', credentials:'omit', signal:AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error('The public post could not be opened (' + response.status + ').');
  if (Number(response.headers.get('content-length')) > 1_000_000) throw new Error('The post document is too large.');
  return response;
}

export async function readPhoto(link) {
  let response = await get(publicUrl(link));
  let body = await response.text();
  if (!response.headers.get('content-type')?.includes('json') && !body.trimStart().startsWith('{')) {
    const doc = document.createElement('template');
    doc.innerHTML = body;
    const alternate = doc.content.querySelector('link[rel="alternate"][type="application/json"][href]');
    if (!alternate) throw new Error('This page does not expose a Blygger item.');
    response = await get(publicUrl(alternate.getAttribute('href'), response.url));
    body = await response.text();
  }
  if (body.length > 1_000_000) throw new Error('The post document is too large.');
  const item = JSON.parse(body);
  if (!idPattern.test(item.id) || !item.origin || !Number.isInteger(item.version) ||
      item.version < 1 || !['fragment','thread'].includes(item.kind) || typeof item.content_md !== 'string') {
    throw new Error('This link does not name a live Blygger post.');
  }
  const origin = publicUrl(item.origin);
  if (!origin.pathname.endsWith('/')) throw new Error('The publisher origin is missing its final slash.');
  const manifestResponse = await get(publicUrl('blyg.json', origin));
  const manifest = await manifestResponse.json();
  if (publicUrl(manifest.site || origin.href).href !== origin.href) throw new Error('The publisher manifest does not match the post origin.');
  const expected = publicUrl((manifest.item || 'items/{id}.json').replace('{id}', item.id), origin).href;
  if (new URL(response.url).href !== expected) throw new Error('The document was not served at the publisher’s declared item address.');
  const media = item.media?.find((candidate) => /^image\/(jpeg|png|webp|gif|avif)$/i.test(candidate.mime));
  if (!media || typeof media.url !== 'string') throw new Error('The post needs an attached photograph.');
  const html = document.createElement('template');
  html.innerHTML = typeof item.content_html === 'string' ? item.content_html : '';
  const caption = Array.from(html.content.querySelectorAll('p')).map((p) => p.textContent.trim()).find(Boolean);
  return {
    id:item.id, origin:origin.href, version:item.version, kind:item.kind, stub:item.stub_of,
    author:typeof item.author?.name === 'string' && item.author.name.trim() ? item.author.name : origin.hostname,
    caption:(caption || '').slice(0,300), alt:typeof media.alt === 'string' ? media.alt : '',
    photo:publicUrl(media.url,origin).href, page:publicUrl(item.page || expected,origin).href,
  };
}

export function checkReply(original, reply) {
  const link = reply.stub;
  if (reply.kind !== 'thread' || link?.origin !== original.origin || link.id !== original.id || link.version !== original.version) {
    throw new Error('This post does not reply to the displayed version of the original photo.');
  }
  if (reply.origin === original.origin) throw new Error('Use a reply published on a separate blog.');
  return reply;
}
