const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {makeCard, renderCard} = require('./card.cjs');
const root = path.resolve(__dirname, '..');
const results = path.join(root, 'results');
const token = crypto.randomBytes(24).toString('hex');
const port = Number(process.env.CARD_PORT || 4317);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {'Content-Type': type, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}
async function body(req) {
  let size = 0, chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > 13_000_000) throw new Error('Image trop volumineuse (8 Mo maximum).'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString());
}
const server = http.createServer(async (req, res) => {
  try {
    if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) return send(res, 403, {error:'Host refusé.'});
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (req.method === 'POST') {
      if (req.headers['x-card-token'] !== token) return send(res, 403, {error:'Rechargez le créateur.'});
      if (!['/api/render','/api/save'].includes(url.pathname)) return send(res, 404, {error:'Introuvable.'});
      const input = await body(req);
      const card = makeCard(input);
      const html = renderCard(card);
      if (url.pathname === '/api/render') return send(res, 200, {card, html});
      await fs.mkdir(results, {recursive:true});
      const slug = card.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'meme';
      const basename = `${slug}-${card.rarityLabel.replace(/ /g,'-')}-${new Date().toISOString().replace(/[:.]/g,'-')}-${card.id.slice(0,8)}`;
      const htmlPath = path.join(results, basename + '.html');
      const jsonPath = path.join(results, basename + '.json');
      try {
        await fs.writeFile(jsonPath, JSON.stringify(card, null, 2) + '\n', {flag:'wx'});
        await fs.writeFile(htmlPath, html, {flag:'wx'});
      } catch (error) {
        await Promise.allSettled([fs.unlink(jsonPath), fs.unlink(htmlPath)]);
        throw error;
      }
      return send(res, 200, {html: '/results/' + basename + '.html', json: '/results/' + basename + '.json'});
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, {error:'Méthode refusée.'});
    let file;
    if (url.pathname === '/') file = path.join(root,'pipeline/index.html');
    else if (url.pathname === '/api/config') return send(res, 200, {token});
    else if (url.pathname === '/api/results') {
      await fs.mkdir(results, {recursive:true});
      return send(res, 200, {files:(await fs.readdir(results)).filter(f => f.endsWith('.html')).sort().reverse()});
    } else {
      const relative = decodeURIComponent(url.pathname).replace(/^\//,'');
      if (!/^(pipeline\/(app\.js|style\.css)|assets\/[\w. -]+|results\/[\w. -]+\.(html|json))$/.test(relative)) return send(res,404,{error:'Introuvable.'});
      file = path.join(root,relative);
    }
    const data = await fs.readFile(file);
    const type = mime[path.extname(file).toLowerCase()] || 'application/octet-stream';
    if (file.endsWith('index.html')) return send(res,200,data.toString(),type);
    res.writeHead(200,{'Content-Type':type, 'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch(error) {
    send(res, error.code === 'ENOENT' ? 404 : 400, {error: error.message});
  }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Le port ${port} est utilisé. Essayez http://127.0.0.1:${port}/ ou changez CARD_PORT.` : error.message); process.exitCode = 1; });
server.listen(port,'127.0.0.1',() => console.log(`Card creator: http://127.0.0.1:${port}/\nResults: ${results}`));
