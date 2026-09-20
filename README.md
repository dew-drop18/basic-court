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

## What each file does

- `index.html` builds the game page, buttons, online room panel, scoreboard, and control instructions.
- `styles.css` contains the main visual design for the game.
- `easy-shooting.css` contains the shooting interface and online panel styles.
- `spacing.css` contains layout and spacing adjustments.
- `script.js` runs the 3D game, player movement, shooting, scoring, local multiplayer, and online multiplayer.
- `server.js` starts the website server and WebSocket signaling server.
- `package.json` lists the project information, the `ws` dependency, and the `npm start` command.
- `package-lock.json` records the exact installed dependency versions.
- `render.yaml` tells Render how to build and start COURTSIDE.
- `README.md` contains setup, multiplayer, and deployment instructions.

## What the online steps do

1. `npm install` reads `package.json` and installs the `ws` package. `ws` lets the Node server communicate with browsers through WebSockets.
2. `npm start` runs `node server.js`, which starts the COURTSIDE website at port `3000`.
3. When someone opens the game, `index.html` loads the page and `script.js` connects the browser to the same server.
4. Both players enter the same room code. `server.js` places both WebSocket connections in that room and refuses a third player.
5. The host creates a WebRTC offer. The server sends that offer to the joining player.
6. The joining player creates a WebRTC answer. The server sends the answer back to the host.
7. The browsers create a direct WebRTC data connection. The server only helps establish the connection; it does not run the game.
8. During play, `script.js` sends keyboard actions through the data connection. Movement, shooting, jumping, steals, possession, score, and resets are synchronized between both players.
9. On Render, `render.yaml` runs `npm install` during the build and `npm start` after deployment. HTTPS enables the secure `wss://` WebSocket connection needed by the online mode.

## Deployment files

- `render.yaml` is the deployment blueprint. It tells Render to create a Node web service named `courtside`.
- The `buildCommand` installs dependencies before the site starts.
- The `startCommand` launches `server.js`.
- The `healthCheckPath` asks Render to check `/` to confirm the website is responding.
- The `autoDeploy` setting lets Render redeploy when new commits are pushed to GitHub.