const http = require('http');
const WebSocket = require('ws');

const KEY = process.env.KEY || 'une-cle-longue-et-secrete';
const server = http.createServer((req, res) => res.end('ok'));
const wss = new WebSocket.Server({ noServer: true });
let cam = null;
const viewers = new Set();

server.on('upgrade', (req, socket, head) => {
  const u = new URL(req.url, 'http://x');
  if (u.searchParams.get('key') !== KEY) { socket.destroy(); return; }

  wss.handleUpgrade(req, socket, head, (ws) => {
    if (u.pathname === '/cam') {
      cam = ws;
      ws.on('message', (data, isBinary) => {
        if (!isBinary) return;
        for (const v of viewers)
          if (v.readyState === 1 && v.bufferedAmount < 2_000_000) v.send(data, { binary: true });
      });
      ws.on('close', () => { if (cam === ws) cam = null; });
    } else if (u.pathname === '/view') {
      viewers.add(ws);
      ws.send(JSON.stringify({ camOnline: !!cam }));
      ws.on('close', () => viewers.delete(ws));
    } else ws.close();
  });
});

server.listen(process.env.PORT || 3000);