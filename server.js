
const http = require('http');
const WebSocket = require('ws');

const KEY = process.env.KEY;

if (!KEY) {
  throw new Error('La variable KEY doit être configurée dans Render.');
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Camera server is running');
});

const wss = new WebSocket.Server({ noServer: true });

let cam = null;
const viewers = new Set();

server.on('upgrade', (req, socket, head) => {
  const u = new URL(req.url, 'http://localhost');

  if (u.searchParams.get('key') !== KEY) {
    socket.destroy();
    return;
  }

  if (u.pathname !== '/cam' && u.pathname !== '/view') {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    if (u.pathname === '/cam') {
      cam = ws;
      console.log('Camera connected');

      ws.on('message', (data, isBinary) => {
        if (!isBinary) return;

        for (const v of viewers) {
          if (v.readyState === WebSocket.OPEN &&
              v.bufferedAmount < 2_000_000) {
            v.send(data, { binary: true });
          }
        }
      });

      ws.on('close', () => {
        if (cam === ws) cam = null;
        console.log('Camera disconnected');
      });
    } else {
      viewers.add(ws);
      console.log('Viewer connected');

      ws.send(JSON.stringify({ camOnline: !!cam }));

      ws.on('close', () => {
        viewers.delete(ws);
        console.log('Viewer disconnected');
      });
    }
  });
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Camera server listening on port ${PORT}`);
});
