const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const port = Number(process.env.PORT || 3000);
const root = __dirname;
const rooms = new Map();
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function send(client, message) {
  if (client.readyState === 1) client.send(JSON.stringify(message));
}

function leaveRoom(client) {
  if (!client.room) return;
  const room = rooms.get(client.room);
  if (room) {
    room.delete(client);
    for (const peer of room) send(peer, { type: 'peer-left' });
    if (room.size === 0) rooms.delete(client.room);
  }
  client.room = null;
}

const server = http.createServer((request, response) => {
  const requestedPath = decodeURIComponent(request.url.split('?')[0]);
  const relativePath = ['/', '/host', '/join'].includes(requestedPath) ? 'index.html' : requestedPath.replace(/^\/+/, '');
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500);
      response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    response.end(content);
  });
});

const webSocketServer = new WebSocketServer({ server });
webSocketServer.on('connection', (client) => {
  client.on('message', (rawMessage) => {
    let message;
    try {
      message = JSON.parse(rawMessage.toString());
    } catch {
      send(client, { type: 'error', message: 'Invalid message.' });
      return;
    }

    if (message.type === 'join-room') {
      const roomId = String(message.roomId || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{4,12}$/.test(roomId)) {
        send(client, { type: 'error', message: 'Room codes must be 4-12 letters or numbers.' });
        return;
      }
      leaveRoom(client);
      const room = rooms.get(roomId) || new Set();
      if (room.size >= 2) {
        send(client, { type: 'error', message: 'That room is full.' });
        return;
      }
      room.add(client);
      rooms.set(roomId, room);
      client.room = roomId;
      send(client, { type: 'joined', roomId, role: room.size === 1 ? 'host' : 'guest' });
      if (room.size === 2) {
        for (const peer of room) if (peer !== client) send(peer, { type: 'peer-joined' });
      }
      return;
    }

    if (message.type === 'signal' && client.room) {
      const room = rooms.get(client.room);
      for (const peer of room || []) if (peer !== client) send(peer, { type: 'signal', signal: message.signal });
    }
  });
  client.on('close', () => leaveRoom(client));
});

server.listen(port, () => console.log(`COURTSIDE running at http://localhost:${port}`));
