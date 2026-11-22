import { createServer } from 'node:http';
import { stat, readFile, realpath } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const [directory, port = '8765'] = process.argv.slice(2);
const root = await realpath(directory);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.json':'application/json', '.xml':'application/rss+xml', '.jpg':'image/jpeg', '.txt':'text/plain; charset=utf-8' };

createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Cache-Control', 'no-store');
  try {
    if (!['GET', 'HEAD'].includes(request.method)) return response.writeHead(405).end();
    const requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, '.' + requested);
    if (!file.startsWith(root + sep) && file !== root) throw new Error();
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    file = await realpath(file);
    if (!file.startsWith(root + sep)) throw new Error();
    const type = types[extname(file)];
    if (!type) throw new Error();
    response.writeHead(200, { 'Content-Type': type });
    response.end(request.method === 'HEAD' ? undefined : await readFile(file));
  } catch {
    if (!response.headersSent) response.writeHead(404);
    response.end('Not found');
  }
}).listen(Number(port), '127.0.0.1', function () {
  console.log('Serving ' + root + ' at http://127.0.0.1:' + this.address().port + '/');
});
