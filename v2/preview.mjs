import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';

const files = new Set(['index.html', 'app.js', 'model.js', 'viewer.js', 'storage.js', 'reports.js', 'style.css']);
const contentTypes = {html: 'text/html', js: 'text/javascript', css: 'text/css'};
const host = '127.0.0.1';
const initialPort = Number(process.env.PORT ?? 4182);
if (!Number.isInteger(initialPort) || initialPort < 0 || initialPort > 65535) {
  console.error('PORT must be an integer between 0 and 65535.');
  process.exit(1);
}

function previewUrl(port) {
  return `http://${host}:${port}/`;
}

function showAddress(port) {
  const url = previewUrl(port);
  console.log(url);
  if (process.argv.includes('--open') && process.platform === 'win32') {
    const browser = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], {windowsHide:true, detached:true, stdio:'ignore'});
    browser.on('error', () => console.log('Open the address above in your browser.'));
    browser.unref();
  }
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, {Allow:'GET, HEAD'}).end();
    return;
  }
  const route = request.url.split('?')[0];
  const file = route === '/' ? 'index.html' : route.slice(1);
  if (!route.startsWith('/') || !files.has(file)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const data = await readFile(new URL(`./${file}`, import.meta.url));
    response.writeHead(200, {
      'Content-Type': contentTypes[file.split('.').pop()] + '; charset=utf-8',
      'Cache-Control':'no-store',
      'X-Wood-Studio':'v2'
    }).end(request.method === 'HEAD' ? undefined : data);
  } catch {
    response.writeHead(500).end('Could not read the preview file.');
  }
});

server.on('listening', () => showAddress(server.address().port));
server.on('error', async error => {
  if (error.code !== 'EADDRINUSE' || !initialPort) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  try {
    const existing = await fetch(previewUrl(initialPort), {method:'HEAD', redirect:'error', signal:AbortSignal.timeout(1200)});
    if (existing.ok && existing.headers.get('x-wood-studio') === 'v2') {
      showAddress(initialPort);
      return;
    }
  } catch { /* An occupied port can belong to a non-HTTP service. */ }
  server.listen(0, host);
});
server.listen(initialPort, host);
