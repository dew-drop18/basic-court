# basic-court
the base court/platform

## Online multiplayer

Install the server dependency and start the game website:

```bash
npm install
npm start
```

Open `http://localhost:3000` on both computers. Choose **Online Run**, enter the same room code, then choose **Host Run** on one computer and **Join Run** on the other.

The website provides room signaling through WebSockets. Gameplay remains peer-to-peer through WebRTC, so the server does not run the game simulation. Both players use the same controls as local multiplayer: P1 uses WASD, Space, G, Q, and Shift; P2 uses the arrow keys, Enter, L, O, and P.

For public deployment, host the project on a Node-compatible service with HTTPS enabled. The client automatically uses `wss://` when the website is served over HTTPS.