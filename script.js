import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const canvas = document.querySelector('#gameCanvas');
const sceneElement = document.querySelector('#scene');
const scoreElement = document.querySelector('#score');
const cpuScoreElement = document.querySelector('#cpuScore');
const shotsElement = document.querySelector('#shots');
const streakElement = document.querySelector('#streak');
const bestScoreElement = document.querySelector('#bestScore');
const statusText = document.querySelector('#statusText');
const feedback = document.querySelector('#feedback');
const countdownElement = document.querySelector('#countdown');
const chargeMeter = document.querySelector('#chargeMeter');
const meterFill = document.querySelector('#meterFill');
const sweetSpot = document.querySelector('.sweet-spot');
const resetButton = document.querySelector('#resetButton');
const fullscreenButton = document.querySelector('#fullscreenButton');
const titleScreen = document.querySelector('#titleScreen');
const singlePlayerButton = document.querySelector('#singlePlayerButton');
const twoPlayerButton = document.querySelector('#twoPlayerButton');
const onlinePlayerButton = document.querySelector('#onlinePlayerButton');
const onlinePanel = document.querySelector('#onlinePanel');
const closeOnlineButton = document.querySelector('#closeOnlineButton');
const hostOnlineButton = document.querySelector('#hostOnlineButton');
const joinOnlineButton = document.querySelector('#joinOnlineButton');
const roomCode = document.querySelector('#roomCode');
const copyConnectionButton = { addEventListener() {} };
const submitConnectionButton = { addEventListener() {} };
const connectionCode = roomCode;
const onlineStatus = document.querySelector('#onlineStatus');
const modeLabel = document.querySelector('#modeLabel');
const scoreMode = document.querySelector('#scoreMode');
const opponentLabel = document.querySelector('#opponentLabel');
const rangeLabel = document.querySelector('#rangeLabel');
const turnBadge = document.querySelector('#turnBadge');
let peerConnection = null;
let dataChannel = null;
let onlineRole = null;
let localPlayerId = 1;
let onlineStateTimer = 0;
let signalingSocket = null;
const remoteKeys = new Set();

const game = { score: 0, shots: 0, streak: 0, aiScore: 0, aiShots: 0, best: Number(localStorage.getItem('courtside-3d-best') || 0), charging: false, charge: 0, chargeDirection: 1, busy: false, started: false, active: false, countdown: 0, mode: 'single', possession: 1, aiShotTimer: 0, aiMoveTimer: 0, keys: new Set(), guarding: false, stealCooldown: 0, players: { 1: { charging: false, charge: 0, direction: 1, busy: false, velocityY: 0, grounded: true }, 2: { charging: false, charge: 0, direction: 1, busy: false, velocityY: 0, grounded: true } } };
let countdownToken = 0;
bestScoreElement.textContent = String(game.best).padStart(3, '0');
const world = new THREE.Scene();
world.background = new THREE.Color('#a95532');
world.fog = new THREE.Fog('#a95532', 32, 68);
const camera = new THREE.PerspectiveCamera(49, 1, .1, 100);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const courtMaterial = new THREE.MeshStandardMaterial({ color: '#c96738', roughness: .9 });
const lineMaterial = new THREE.MeshBasicMaterial({ color: '#fff4d6' });
const darkMaterial = new THREE.MeshStandardMaterial({ color: '#171a17', roughness: .75 });
const blueMaterial = new THREE.MeshStandardMaterial({ color: '#2349a7', roughness: .55 });
const skinMaterial = new THREE.MeshStandardMaterial({ color: '#a96542', roughness: .7 });
const ballMaterial = new THREE.MeshStandardMaterial({ color: '#e66f26', roughness: .55 });
const woodAccentMaterial = new THREE.MeshStandardMaterial({ color: '#a95130', roughness: .9 });
const bleacherMaterial = new THREE.MeshStandardMaterial({ color: '#24252b', roughness: .8 });
const crowdColors = ['#2349a7', '#d64f35', '#d7f36a', '#f4f0e7', '#8d3b2a'];
const threePointRadius = 8.5;
const shootingSpotZ = 7;
const defenderSpotZ = 4;
camera.position.set(0, 8.9, shootingSpotZ + 15.5);

function addBox(size, position, material, options = {}) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...position); mesh.castShadow = options.castShadow ?? true; mesh.receiveShadow = options.receiveShadow ?? true; world.add(mesh); return mesh; }
function addLine(points, y = .025) { const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) => new THREE.Vector3(x, y, z))); const line = new THREE.Line(geometry, lineMaterial); world.add(line); return line; }
function addCircle(radius, x, z) { const geometry = new THREE.RingGeometry(radius - .1, radius, 96); const ring = new THREE.Mesh(geometry, lineMaterial); ring.rotation.x = -Math.PI / 2; ring.position.set(x, .065, z); world.add(ring); }
function addArc(radius, x, z, start, end, segments = 64) { const points = []; for (let index = 0; index <= segments; index++) { const angle = start + (end - start) * index / segments; points.push([x + Math.cos(angle) * radius, z + Math.sin(angle) * radius]); } addLine(points, .065); }

addBox([28, .12, 46], [0, 0, 4], courtMaterial, { castShadow: false });
addLine([[-12, -17], [12, -17], [12, 25], [-12, 25], [-12, -17]]);
addLine([[-12, -17], [-12, 25]]);
addLine([[-4.9, -17], [-4.9, -8], [4.9, -8], [4.9, -17]]);
addLine([[-4.9, -8], [4.9, -8]]);
addCircle(1.8, 0, -8);
addArc(threePointRadius, 0, -11.9, .16, Math.PI - .16);
addLine([[-8.39, -10.55], [-8.39, -17]]); addLine([[8.39, -10.55], [8.39, -17]]);
addLine([[-12, 4], [12, 4]]);
addCircle(1.8, 0, 4);
addArc(1.8, 0, -18.8, 0, Math.PI);
const paintMarkingMaterial = new THREE.MeshBasicMaterial({ color: '#fff4d6' });
addBox([28, .035, .12], [0, .11, -17], paintMarkingMaterial, { castShadow: false, receiveShadow: false });
addBox([28, .035, .12], [0, .11, 27], paintMarkingMaterial, { castShadow: false, receiveShadow: false });
addBox([.12, .035, 46], [-14, .11, 5], paintMarkingMaterial, { castShadow: false, receiveShadow: false });
addBox([.12, .035, 46], [14, .11, 5], paintMarkingMaterial, { castShadow: false, receiveShadow: false });
addBox([9.8, .035, .12], [0, .12, -8], paintMarkingMaterial, { castShadow: false, receiveShadow: false });

for (let x = -24; x <= 24; x += 3) addBox([.035, .03, 40], [x, .08, 5], new THREE.MeshBasicMaterial({ color: '#171a1710' }), { castShadow: false });

for (let x = -11.5; x <= 11.5; x += 1.25) addBox([.035, .018, 40], [x, .145, 4], woodAccentMaterial, { castShadow: false, receiveShadow: false });

function addBleacherRow(z, y, width, count) {
	addBox([width, .55, 1.25], [0, y, z], bleacherMaterial);
	for (let index = 0; index < count; index++) {
		const x = -width / 2 + (index + .5) * (width / count);
		const person = new THREE.Group();
		const body = new THREE.Mesh(new THREE.CapsuleGeometry(.18, .32, 4, 8), new THREE.MeshStandardMaterial({ color: crowdColors[index % crowdColors.length] }));
		body.position.y = .35; body.castShadow = true; person.add(body);
		const head = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6), skinMaterial);
		head.position.y = .72; head.castShadow = true; person.add(head);
		person.position.set(x, y + .25, z - .18); world.add(person);
	}
}
for (let row = 0; row < 4; row++) addBleacherRow(-22 + row * 1.35, .55 + row * .48, 22 - row * .8, 16 - row);
for (let side = -1; side <= 1; side += 2) {
	for (let row = 0; row < 3; row++) {
		const sideZ = -3 + row * 2.1;
		addBox([1.1, .48, 15], [side * 13.2, .5 + row * .45, sideZ], bleacherMaterial);
		for (let index = 0; index < 7; index++) {
			const person = new THREE.Group();
			const body = new THREE.Mesh(new THREE.CapsuleGeometry(.18, .34, 4, 8), new THREE.MeshStandardMaterial({ color: crowdColors[(index + row) % crowdColors.length] }));
			body.position.y = .38; person.add(body);
			const head = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6), skinMaterial); head.position.y = .75; person.add(head);
			person.position.set(side * 12.7, .75 + row * .45, sideZ - 6.5 + index * 2.1); world.add(person);
		}
	}
}

addBox([.25, 5.8, .25], [-7.9, 2.9, -18.2], darkMaterial);
addBox([.25, 5.8, .25], [7.9, 2.9, -18.2], darkMaterial);
addBox([16.2, .18, .22], [0, 5.8, -18.2], darkMaterial);
const backboard = addBox([7.2, 3.9, .18], [0, 4.4, -18.2], new THREE.MeshStandardMaterial({ color: '#e7e4d6', roughness: .3, transparent: true, opacity: .9 }));
addBox([3.1, .12, .12], [0, 3.1, -18.55], ballMaterial);
const rim = new THREE.Mesh(new THREE.TorusGeometry(1.05, .1, 14, 40), ballMaterial); rim.rotation.x = Math.PI / 2; rim.position.set(0, 3.1, -18.8); rim.castShadow = true; world.add(rim);
for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI * 2; const net = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1.3, 5), lineMaterial); net.position.set(Math.cos(a) * .9, 2.55, -18.8 + Math.sin(a) * .9); net.rotation.z = Math.cos(a) * .25; world.add(net); }

const player = new THREE.Group();
const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.65, 1.35, 5, 12), blueMaterial); torso.position.y = 1.15; torso.castShadow = true; player.add(torso);
const head = new THREE.Mesh(new THREE.SphereGeometry(.43, 20, 14), skinMaterial); head.position.y = 2.45; head.castShadow = true; player.add(head);
const shorts = addBox([1.35, .46, .8], [0, .37, 0], blueMaterial); player.add(shorts); shorts.castShadow = true;
function addBodyPart(group, geometry, material, position, rotation = [0, 0, 0]) { const part = new THREE.Mesh(geometry, material); part.position.set(...position); part.rotation.set(...rotation); part.castShadow = true; group.add(part); return part; }
const limbMaterial = new THREE.MeshStandardMaterial({ color: '#a96542', roughness: .72 });
const shoeMaterial = new THREE.MeshStandardMaterial({ color: '#f4f0e7', roughness: .5 });
const hairMaterial = new THREE.MeshStandardMaterial({ color: '#241b19', roughness: .9 });
addBodyPart(player, new THREE.CylinderGeometry(.14, .17, 1.05, 10), limbMaterial, [-.42, 1.2, 0], [0, 0, -.2]);
addBodyPart(player, new THREE.CylinderGeometry(.14, .17, 1.05, 10), limbMaterial, [.42, 1.2, 0], [0, 0, .2]);
addBodyPart(player, new THREE.CylinderGeometry(.2, .16, .8, 10), limbMaterial, [-.3, -.02, 0], [0, 0, .08]);
addBodyPart(player, new THREE.CylinderGeometry(.2, .16, .8, 10), limbMaterial, [.3, -.02, 0], [0, 0, -.08]);
addBodyPart(player, new THREE.BoxGeometry(.38, .16, .62), shoeMaterial, [-.34, -.43, -.08]);
addBodyPart(player, new THREE.BoxGeometry(.38, .16, .62), shoeMaterial, [.34, -.43, -.08]);
addBodyPart(player, new THREE.SphereGeometry(.45, 16, 8, 0, Math.PI * 2, 0, Math.PI * .35), hairMaterial, [0, 2.63, 0]);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: '#542719', transparent: true, opacity: .28 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .08; player.add(shadow);
player.position.set(0, 0, shootingSpotZ); world.add(player);
const opponent = player.clone();
opponent.position.set(0, 0, defenderSpotZ);
player.rotation.y = 0;
opponent.rotation.y = Math.PI;
opponent.visible = false;
opponent.traverse((child) => { if (child.material) child.material = child.material.clone(); if (child.material?.color) child.material.color.set('#d64f35'); });
world.add(opponent);
const ball = new THREE.Mesh(new THREE.SphereGeometry(.38, 18, 12), ballMaterial); ball.position.set(4.3, 1.2, 6.5); ball.castShadow = true; world.add(ball);
const ballTwo = ball.clone(); ballTwo.position.set(-4.7, 1.2, 6.5); ballTwo.visible = false; world.add(ballTwo);

const ambient = new THREE.HemisphereLight('#f4dfbf', '#45261b', 2.3); world.add(ambient);
const keyLight = new THREE.DirectionalLight('#fff3d1', 4.2); keyLight.position.set(-10, 17, 8); keyLight.castShadow = true; keyLight.shadow.mapSize.set(2048, 2048); world.add(keyLight);
const fillLight = new THREE.PointLight('#df7449', 12, 35); fillLight.position.set(8, 8, -10); world.add(fillLight);

function resize() { const width = sceneElement.clientWidth; const height = sceneElement.clientHeight; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }
function renderHud() { scoreElement.textContent = String(game.score).padStart(3, '0'); cpuScoreElement.textContent = String(game.aiScore).padStart(3, '0'); shotsElement.textContent = String(game.shots).padStart(2, '0'); streakElement.textContent = game.streak; bestScoreElement.textContent = String(game.best).padStart(3, '0'); scoreMode.textContent = game.mode === 'single' ? 'VS CPU' : game.mode === 'online' ? 'ONLINE' : 'LOCAL'; opponentLabel.textContent = game.mode === 'single' ? 'CPU' : 'P2'; }
function getPlayer(id) { return id === 1 ? player : opponent; }
function getBall(id) { return game.mode !== 'single' ? ball : (id === 1 ? ball : ballTwo); }
function activeShooter() { return player; }
function isInPocket(id = 1) { const shooter = getPlayer(id); const hoopDistance = Math.hypot(shooter.position.x, shooter.position.z + 18.8); return hoopDistance <= 3.2 || Math.abs(shooter.position.x) < 5.8 && shooter.position.z > -15 && shooter.position.z < 14; }
function getShotLevel(id = 1) {
	const shooter = getPlayer(id);
	const distance = Math.hypot(shooter.position.x, shooter.position.z + 18.8);
	if (distance <= 3.2) return { name: 'DUNK', points: 2, min: 35, max: 65 };
	if (distance <= 10) return { name: 'LAYUP', points: 1, min: 28, max: 72 };
	if (distance <= 16) return { name: 'MIDRANGE', points: 2, min: 34, max: 66 };
	if (distance <= 24) return { name: 'THREE', points: 3, min: 40, max: 60 };
	return { name: 'DEEP THREE', points: 4, min: 45, max: 55 };
}
function updateStatus() { const level = getShotLevel(game.mode !== 'single' ? game.possession : 1); rangeLabel.textContent = `${level.name} / ${level.points} PT${level.points === 1 ? '' : 'S'}`; statusText.textContent = game.guarding ? 'LOCKED IN — PRESS Q/O TO STEAL' : `${level.name} — ${level.points} PT${level.points === 1 ? '' : 'S'}`; }
function updateChargeMeterPosition() {
	if (!chargeMeter.classList.contains('active')) return;
	const holderId = game.mode === 'single' ? (game.possession === 2 ? 2 : 1) : game.possession;
	const level = getShotLevel(holderId);
	sweetSpot.style.left = `${level.min}%`;
	sweetSpot.style.width = `${level.max - level.min}%`;
	const screenPosition = getPlayer(holderId).position.clone();
	screenPosition.y = .05;
	screenPosition.project(camera);
	const x = (screenPosition.x * .5 + .5) * sceneElement.clientWidth;
	const y = (-screenPosition.y * .5 + .5) * sceneElement.clientHeight + 22;
	chargeMeter.style.left = `${x}px`;
	chargeMeter.style.top = `${y}px`;
}
function setSinglePossession(id) {
	game.possession = id;
	game.aiMoveTimer = id === 2 && game.mode === 'single' ? 2200 : 0;
	game.aiShotTimer = 0;
	game.players[1].charging = false;
	game.players[2].charging = false;
	ball.visible = game.mode !== 'single' || id === 1;
	ballTwo.visible = game.mode === 'single' && id === 2;
	const holder = getPlayer(id);
	getBall(id).position.set(holder.position.x - .9, 1.25, holder.position.z - .6);
	if (game.mode !== 'single') {
		turnBadge.textContent = `PLAYER ${id}'S BALL`;
		turnBadge.classList.add('visible');
	}
}
function attemptSteal(id = 1) {
	if (game.stealCooldown > 0 || game.players[id].busy) return;
	const defender = game.mode === 'single' ? opponent : getPlayer(id === 1 ? 2 : 1);
	const attacker = game.mode === 'single' ? player : getPlayer(id);
	const distance = defender.position.distanceTo(attacker.position);
	game.stealCooldown = 650;
	const defenderHasBall = game.mode === 'single' ? game.possession === 2 : game.possession === (id === 1 ? 2 : 1);
	if (distance < 2.2 && defenderHasBall) {
		game.stealCooldown = 1200;
		showFeedback('STOLEN', true);
		statusText.textContent = 'POCKET PICKED — BALL IS YOURS';
		setSinglePossession(id);
	} else {
		showFeedback('REACH', false);
		statusText.textContent = 'TOO FAR — STAY IN FRONT';
	}
}
function showFeedback(text, made) { feedback.textContent = text; feedback.className = `feedback show${made ? '' : ' miss'}`; window.setTimeout(() => feedback.className = 'feedback', 900); }
function sendOnline(message) { if (dataChannel?.readyState === 'open') dataChannel.send(JSON.stringify(message)); }
function setOnlineStatus(message) { onlineStatus.textContent = message; }
function waitForIceGathering() { return new Promise((resolve) => { if (peerConnection.iceGatheringState === 'complete') { resolve(); return; } const check = () => { if (peerConnection.iceGatheringState === 'complete') { peerConnection.removeEventListener('icegatheringstatechange', check); resolve(); } }; peerConnection.addEventListener('icegatheringstatechange', check); window.setTimeout(resolve, 4000); }); }
function sendSignal(signal) { if (signalingSocket?.readyState === WebSocket.OPEN) signalingSocket.send(JSON.stringify({ type: 'signal', signal })); }
async function createHostOffer() { const offer = await peerConnection.createOffer(); await peerConnection.setLocalDescription(offer); await waitForIceGathering(); sendSignal({ type: 'offer', description: peerConnection.localDescription }); setOnlineStatus(`Room ${roomCode.value} is ready. Waiting for the other player...`); }
async function handleSignal(signal) {
	if (signal.type === 'offer' && onlineRole === 'guest') { await peerConnection.setRemoteDescription(signal.description); const answer = await peerConnection.createAnswer(); await peerConnection.setLocalDescription(answer); await waitForIceGathering(); sendSignal({ type: 'answer', description: peerConnection.localDescription }); setOnlineStatus('Room found. Connecting...'); }
	if (signal.type === 'answer' && onlineRole === 'host') { await peerConnection.setRemoteDescription(signal.description); setOnlineStatus('Answer received. Connecting...'); }
}
function connectSignaling() {
	return new Promise((resolve, reject) => {
		if (location.protocol === 'file:') { setOnlineStatus('Start the game with npm start to use online rooms.'); reject(new Error('Online rooms require the web server.')); return; }
		if (signalingSocket?.readyState === WebSocket.OPEN) { resolve(); return; }
		signalingSocket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
		signalingSocket.onopen = () => resolve();
		signalingSocket.onerror = () => { setOnlineStatus('Could not reach the multiplayer server.'); reject(new Error('Signaling connection failed.')); };
		signalingSocket.onclose = () => { if (!game.active) setOnlineStatus('Multiplayer server connection closed.'); };
		signalingSocket.onmessage = async (event) => {
			const message = JSON.parse(event.data);
			if (message.type === 'joined') { preparePeer(message.role); setOnlineStatus(message.role === 'host' ? `Room ${message.roomId} created. Waiting for a player...` : 'Joined room. Waiting for the host...'); }
			if (message.type === 'peer-joined' && onlineRole === 'host') await createHostOffer();
			if (message.type === 'signal') await handleSignal(message.signal);
			if (message.type === 'peer-left') setOnlineStatus('The other player left the room.');
			if (message.type === 'error') setOnlineStatus(message.message);
		};
	});
}
function handleOnlineMessage(message) {
	const remotePlayerId = localPlayerId === 1 ? 2 : 1;
	if (message.type === 'input') { if (message.down) { remoteKeys.add(message.key); if (message.key === (remotePlayerId === 1 ? ' ' : 'enter')) beginCharge(remotePlayerId); } else remoteKeys.delete(message.key); return; }
	if (message.type === 'action') { if (message.action === 'shoot') shoot(remotePlayerId); if (message.action === 'jump') jumpPlayer(remotePlayerId); if (message.action === 'steal') attemptSteal(remotePlayerId); return; }
	if (message.type === 'reset') { reset(); return; }
	if (message.type === 'state' && onlineRole === 'guest') {
		player.position.fromArray(message.player); opponent.position.fromArray(message.opponent); game.score = message.score; game.aiScore = message.aiScore; game.shots = message.shots; game.streak = message.streak; game.possession = message.possession; renderHud(); updateStatus();
	}
}
function attachDataChannel(channel) {
	dataChannel = channel;
	dataChannel.onopen = () => { setOnlineStatus('CONNECTED. Starting the run...'); startGame('online'); if (onlineRole === 'host') sendOnline({ type: 'start' }); };
	dataChannel.onmessage = (event) => handleOnlineMessage(JSON.parse(event.data));
	dataChannel.onclose = () => setOnlineStatus('Connection closed.');
}
function preparePeer(role) {
	peerConnection?.close(); onlineRole = role; localPlayerId = role === 'host' ? 1 : 2; remoteKeys.clear();
	peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
	peerConnection.onconnectionstatechange = () => { if (['failed', 'disconnected'].includes(peerConnection.connectionState)) setOnlineStatus('Connection lost.'); };
	if (role === 'host') attachDataChannel(peerConnection.createDataChannel('courtside')); else peerConnection.ondatachannel = (event) => attachDataChannel(event.channel);
}
function getRoomCode() { const value = roomCode.value.trim().toUpperCase() || Math.random().toString(36).slice(2, 8).toUpperCase(); roomCode.value = value; return value; }
async function hostOnlineGame() { try { await connectSignaling(); signalingSocket.send(JSON.stringify({ type: 'join-room', roomId: getRoomCode() })); } catch (error) { /* Status is already shown in the panel. */ } }
async function joinOnlineGame() { if (!roomCode.value.trim()) { setOnlineStatus('Enter a room code first.'); return; } try { await connectSignaling(); signalingSocket.send(JSON.stringify({ type: 'join-room', roomId: getRoomCode() })); } catch (error) { /* Status is already shown in the panel. */ } }
function sendOnlineState() { if (game.mode !== 'online' || onlineRole !== 'host') return; sendOnline({ type: 'state', player: player.position.toArray(), opponent: opponent.position.toArray(), score: game.score, aiScore: game.aiScore, shots: game.shots, streak: game.streak, possession: game.possession }); }
function resetShooterAtThreePointLine(id) {
	const shooter = getPlayer(id);
	const defender = getPlayer(id === 1 ? 2 : 1);
	shooter.position.set(0, 0, shootingSpotZ);
	defender.position.set(0, 0, defenderSpotZ);
	shooter.rotation.y = 0;
	defender.rotation.y = Math.PI;
	game.players[id].velocityY = 0;
	game.players[id].grounded = true;
}
function shoot(id = 1, isCpu = false) {
	const shooterState = game.players[id];
	if (shooterState.busy) return;
	if (game.mode !== 'single' && game.possession !== id) return;
	shooterState.busy = true;
	shooterState.charging = false;
	chargeMeter.classList.remove('active');
	const shooter = getPlayer(id);
	const shooterBall = getBall(id);
	const level = getShotLevel(id);
	const sweet = shooterState.charge >= level.min && shooterState.charge <= level.max;
	const defender = game.mode === 'single' ? (id === 2 ? player : opponent) : getPlayer(id === 1 ? 2 : 1);
	const contested = defender.position.distanceTo(shooter.position) < 1.65 && defender.userData.guarding;
	const made = isCpu ? Math.random() < 0.42 : sweet && isInPocket(id) && !contested;
	game.shots++;
	if (made) {
		if (isCpu) game.aiScore += level.points;
		else game.score += level.points;
		game.streak++;
		if (!isCpu) {
			game.best = Math.max(game.best, game.score);
			localStorage.setItem('courtside-3d-best', game.best);
		}
		showFeedback(isCpu ? `CPU +${level.points}` : `${level.name} +${level.points}`, true);
		statusText.textContent = isCpu ? 'CPU SCORES — TAKE THE BALL BACK' : `${level.name} CASH — KEEP THE RUN ALIVE`;
	} else {
		game.streak = 0;
		showFeedback(sweet ? 'OFF LINE' : `${level.name} BRICK`, false);
		statusText.textContent = sweet ? `GET THE ${level.name} LOOK` : `TIME THE ${level.name}`;
	}
	renderHud();

	// Solve an actual projectile arc so the ball reaches the hoop only on a make.
	const start = shooterBall.position.clone();
	const target = new THREE.Vector3(made ? 0 : THREE.MathUtils.randFloatSpread(2.8), 3.15, -18.8 + (made ? 0 : THREE.MathUtils.randFloat(1.5, 3)));
	const duration = 1.15;
	const gravity = -14.5;
	const velocity = new THREE.Vector3(
		(target.x - start.x) / duration,
		(target.y - start.y - 0.5 * gravity * duration * duration) / duration,
		(target.z - start.z) / duration,
	);
	const startedAt = performance.now();
	const animateShot = (now) => {
		const elapsed = Math.min((now - startedAt) / 1000, duration);
		shooterBall.position.copy(start).addScaledVector(velocity, elapsed);
		shooterBall.position.y += 0.5 * gravity * elapsed * elapsed;
		shooterBall.rotation.x += .16;
		shooterBall.rotation.z += .11;
		if (elapsed < duration) requestAnimationFrame(animateShot);
	};
	requestAnimationFrame(animateShot);
	window.setTimeout(() => {
		if (made) {
			resetShooterAtThreePointLine(id);
			setSinglePossession(id);
			statusText.textContent = isCpu ? 'MAKE IT, TAKE IT — CPU BALL' : 'MAKE IT, TAKE IT — YOUR BALL';
		} else {
			const nextPlayer = id === 1 ? 2 : 1;
			resetShooterAtThreePointLine(id);
			setSinglePossession(nextPlayer);
			statusText.textContent = isCpu ? 'CPU MISSES — YOUR BALL' : 'MISS — TAKE THE BALL';
		}
		shooterState.busy = false;
	}, duration * 1000 + 120);
}
function beginCharge(id = 1) { const shooterState = game.players[id]; if (shooterState.busy || shooterState.charging) return; game.started = true; sceneElement.classList.add('started'); shooterState.charging = true; shooterState.charge = 0; shooterState.direction = 1; chargeMeter.classList.add('active'); chargeFrame(id); }
function chargeFrame(id) { const shooterState = game.players[id]; if (!shooterState.charging) return; shooterState.charge += shooterState.direction * 1.05; if (shooterState.charge >= 100 || shooterState.charge <= 0) shooterState.direction *= -1; meterFill.style.width = `${shooterState.charge}%`; requestAnimationFrame(() => chargeFrame(id)); }
function runCountdown(token, count) { if (token !== countdownToken) return; countdownElement.textContent = count > 0 ? count : 'GO'; countdownElement.classList.remove('visible'); void countdownElement.offsetWidth; countdownElement.classList.add('visible'); game.countdown = count; statusText.textContent = count > 0 ? `STARTING IN ${count}` : 'STEP INTO THE LIGHT'; if (count > 0) window.setTimeout(() => runCountdown(token, count - 1), 1000); else window.setTimeout(() => { if (token === countdownToken) countdownElement.classList.remove('visible'); }, 500); }
function startCountdown() { countdownToken++; runCountdown(countdownToken, 3); }
function reset() { if (game.mode === 'online' && onlineRole === 'guest') { sendOnline({ type: 'reset' }); return; } game.score = 0; game.shots = 0; game.streak = 0; game.aiScore = 0; game.aiShots = 0; game.busy = false; game.charging = false; game.possession = 1; game.aiShotTimer = 0; game.aiMoveTimer = 0; game.stealCooldown = 0; game.players[1] = { charging: false, charge: 0, direction: 1, busy: false, velocityY: 0, grounded: true }; game.players[2] = { charging: false, charge: 0, direction: 1, busy: false, velocityY: 0, grounded: true }; player.position.set(0, 0, shootingSpotZ); opponent.position.set(0, 0, defenderSpotZ); ball.position.set(-.9, 1.2, shootingSpotZ - .6); ballTwo.position.set(-.9, 1.2, defenderSpotZ - .6); ball.visible = true; ballTwo.visible = false; turnBadge.textContent = "PLAYER 1'S BALL"; turnBadge.classList.toggle('visible', game.mode !== 'single'); sceneElement.classList.remove('started'); chargeMeter.classList.remove('active'); renderHud(); startCountdown(); if (game.mode === 'online') sendOnline({ type: 'state', player: player.position.toArray(), opponent: opponent.position.toArray(), score: game.score, aiScore: game.aiScore, shots: game.shots, streak: game.streak, possession: game.possession }); }
function startGame(mode) { if (game.active && game.mode === mode) return; game.mode = mode; game.active = true; game.possession = 1; player.position.set(0, 0, shootingSpotZ); opponent.position.set(0, 0, defenderSpotZ); titleScreen.classList.add('hidden'); opponent.visible = mode !== 'single'; ball.visible = true; ballTwo.visible = false; setSinglePossession(1); modeLabel.textContent = mode === 'single' ? '1P VS CPU' : mode === 'online' ? '2P ONLINE DUEL' : '2P LOCAL DUEL'; turnBadge.textContent = "PLAYER 1'S BALL"; turnBadge.classList.toggle('visible', mode !== 'single'); renderHud(); sceneElement.focus(); startCountdown(); }
function updateCpu() {
	const distanceToPlayer = opponent.position.distanceTo(player.position);
	if (game.possession === 1) {
		if (game.players[1].busy) return;
		const defensiveSpot = player.position.clone().add(new THREE.Vector3(.75, 0, -.45));
		opponent.position.lerp(defensiveSpot, .022);
		opponent.userData.guarding = distanceToPlayer < 2.2;
		if (distanceToPlayer < 1.6 && !game.guarding && game.stealCooldown <= 0) {
			game.stealCooldown = 1100;
			showFeedback('CPU STEAL', false);
			statusText.textContent = 'CPU PICKED YOUR POCKET — GET IT BACK';
			setSinglePossession(2);
		}
		return;
	}

	opponent.userData.guarding = false;
	game.aiMoveTimer = Math.max(0, game.aiMoveTimer - 16);
	if (game.aiMoveTimer > 0) {
		const roamTime = performance.now() / 420;
		opponent.position.x = THREE.MathUtils.clamp(opponent.position.x + Math.sin(roamTime) * .045, -8.5, 8.5);
		opponent.position.z = THREE.MathUtils.clamp(opponent.position.z + Math.cos(roamTime * .8) * .035, -13, 10);
		if (!game.players[2].busy) ballTwo.position.set(opponent.position.x - .9, 1.12 + Math.abs(Math.sin(performance.now() / 120)) * .24, opponent.position.z - .6);
		return;
	}
	const hoop = new THREE.Vector3(0, 0, -12);
	const driveDirection = hoop.sub(opponent.position).normalize();
	opponent.position.addScaledVector(driveDirection, .025);
	if (!game.players[2].busy) ballTwo.position.set(opponent.position.x - .9, 1.12 + Math.abs(Math.sin(performance.now() / 120)) * .24, opponent.position.z - .6);
	game.aiShotTimer = Math.max(0, game.aiShotTimer - 16);
	if (!game.players[2].busy && !game.players[2].charging && game.aiShotTimer === 0) {
		beginCharge(2);
		game.aiShotTimer = 3400;
		window.setTimeout(() => { if (game.mode === 'single' && game.possession === 2) { game.aiShots++; shoot(2, true); } }, 820);
	}
}

let previousFrameTime = performance.now();
function syncHeldBall() { if (game.mode === 'single' && game.possession === 2 && !game.players[2].busy) ballTwo.position.set(opponent.position.x - .9, 1.25 + opponent.position.y, opponent.position.z - .6); if (game.mode === 'single' && game.possession === 1 && !game.players[1].busy) ball.position.set(player.position.x - .9, 1.25 + player.position.y, player.position.z - .6); if (game.mode !== 'single' && !game.players[game.possession].busy) ball.position.set(getPlayer(game.possession).position.x - .9, 1.25 + getPlayer(game.possession).position.y, getPlayer(game.possession).position.z - .6); }
function animate(now = performance.now()) {
	requestAnimationFrame(animate);
	const delta = Math.min((now - previousFrameTime) / 1000, .05);
	previousFrameTime = now;
	game.stealCooldown = Math.max(0, game.stealCooldown - 16);
	if (game.active && game.countdown === 0) {
		if (game.mode === 'single') {
			updateCpu();
			player.userData.guarding = game.keys.has('g');
			movePlayer(1, ['a', 'd', 'w', 's']);
		} else if (game.mode === 'online') {
			const localControls = localPlayerId === 1 ? ['a', 'd', 'w', 's'] : ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'];
			const remoteControls = localPlayerId === 1 ? ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'] : ['a', 'd', 'w', 's'];
			player.userData.guarding = localPlayerId === 1 ? game.keys.has('g') : remoteKeys.has('g');
			opponent.userData.guarding = localPlayerId === 2 ? game.keys.has('l') : remoteKeys.has('l');
			movePlayer(localPlayerId, localControls, game.keys);
			movePlayer(localPlayerId === 1 ? 2 : 1, remoteControls, remoteKeys);
		} else {
			player.userData.guarding = game.keys.has('g');
			opponent.userData.guarding = game.keys.has('l');
			movePlayer(1, ['a', 'd', 'w', 's']);
			movePlayer(2, ['arrowleft', 'arrowright', 'arrowup', 'arrowdown']);
		}
		applyPlayerPhysics(1, delta);
		applyPlayerPhysics(2, delta);
		separatePlayers();
		syncHeldBall();
	}
	const cameraDepth = Math.max(player.position.z + 15.5, shootingSpotZ + 15.5);
	const desiredCamera = new THREE.Vector3(player.position.x * .46, 8.9, cameraDepth);
	camera.position.lerp(desiredCamera, .07); camera.lookAt(player.position.x * .16, 1.9, -5); renderer.render(world, camera);
	updateChargeMeterPosition();
	if (game.mode === 'online' && onlineRole === 'host' && now - onlineStateTimer > 100) { onlineStateTimer = now; sendOnlineState(); }
}
function jumpPlayer(id) { const state = game.players[id]; if (!state.grounded || state.busy) return; state.velocityY = 5.2; state.grounded = false; }
function applyPlayerPhysics(id, delta) { const target = getPlayer(id); const state = game.players[id]; if (state.grounded && target.position.y !== 0) target.position.y = 0; if (!state.grounded) { state.velocityY -= 14 * delta; target.position.y += state.velocityY * delta; if (target.position.y <= 0) { target.position.y = 0; state.velocityY = 0; state.grounded = true; } } }
function separatePlayers() { if (!game.active || game.mode === 'single') return; const offset = opponent.position.clone().sub(player.position); offset.y = 0; const distance = offset.length(); if (distance > 0 && distance < 1.35) { const correction = offset.normalize().multiplyScalar((1.35 - distance) / 2); player.position.addScaledVector(correction, -1); opponent.position.add(correction); } }
function movePlayer(id, controls, keySet = game.keys) { const target = getPlayer(id); const move = new THREE.Vector3(); if (keySet.has(controls[0])) move.x -= 1; if (keySet.has(controls[1])) move.x += 1; if (keySet.has(controls[2])) move.z -= 1; if (keySet.has(controls[3])) move.z += 1; if (!move.lengthSq() || game.players[id].busy) return; move.normalize().multiplyScalar(.14); target.position.add(move); target.position.x = THREE.MathUtils.clamp(target.position.x, -11.5, 11.5); target.position.z = THREE.MathUtils.clamp(target.position.z, -17, 16); if (game.possession === id) getBall(id).position.set(target.position.x - .9, 1.25 + target.position.y, target.position.z - .6); updateStatus(); }
window.addEventListener('resize', resize); window.addEventListener('keydown', (event) => { const key = event.key.toLowerCase(); if (['arrowleft','arrowright','arrowup','arrowdown',' ','w','a','s','d','q','g','l','o','enter','shift','p'].includes(key)) event.preventDefault(); if (!game.active || game.countdown > 0) return; game.keys.add(key); if (game.mode === 'online') sendOnline({ type: 'input', key, down: true }); const playerId = game.mode === 'online' ? localPlayerId : 1; if (key === 'shift' && playerId === 1) { jumpPlayer(playerId); if (game.mode === 'online') sendOnline({ type: 'action', action: 'jump' }); } if (key === 'p' && (game.mode === 'two' || game.mode === 'online')) { if (game.mode === 'online' && localPlayerId !== 2) return; jumpPlayer(2); if (game.mode === 'online') sendOnline({ type: 'action', action: 'jump' }); } if (key === ' ') beginCharge(playerId); if (key === 'enter' && (game.mode === 'two' || game.mode === 'online')) beginCharge(2); if (key === 'q' && playerId === 1) { attemptSteal(1); if (game.mode === 'online') sendOnline({ type: 'action', action: 'steal' }); } if (key === 'o' && (game.mode === 'two' || game.mode === 'online')) { if (game.mode === 'online' && localPlayerId !== 2) return; attemptSteal(2); if (game.mode === 'online') sendOnline({ type: 'action', action: 'steal' }); } updateStatus(); }); window.addEventListener('keyup', (event) => { const key = event.key.toLowerCase(); game.keys.delete(key); if (game.mode === 'online') sendOnline({ type: 'input', key, down: false }); if (!game.active || game.countdown > 0) return; const playerId = game.mode === 'online' ? localPlayerId : 1; if (key === ' ' && game.players[playerId].charging) { shoot(playerId); if (game.mode === 'online') sendOnline({ type: 'action', action: 'shoot' }); } if (key === 'enter' && (game.mode === 'two' || game.mode === 'online') && game.players[2].charging) { shoot(2); if (game.mode === 'online') sendOnline({ type: 'action', action: 'shoot' }); } updateStatus(); }); sceneElement.addEventListener('click', () => sceneElement.focus()); resetButton.addEventListener('click', reset); singlePlayerButton.addEventListener('click', () => startGame('single')); twoPlayerButton.addEventListener('click', () => startGame('two')); onlinePlayerButton.addEventListener('click', () => { onlinePanel.classList.add('visible'); }); closeOnlineButton.addEventListener('click', () => onlinePanel.classList.remove('visible')); hostOnlineButton.addEventListener('click', hostOnlineGame); joinOnlineButton.addEventListener('click', joinOnlineGame); submitConnectionButton.addEventListener('click', submitOnlineCode); copyConnectionButton.addEventListener('click', async () => { await navigator.clipboard.writeText(connectionCode.value); setOnlineStatus('Code copied.'); });
fullscreenButton.addEventListener('click', async () => { if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.(); else await document.exitFullscreen?.(); });
document.addEventListener('fullscreenchange', () => { const active = Boolean(document.fullscreenElement); fullscreenButton.innerHTML = active ? 'EXIT FULLSCREEN <b>×</b>' : 'FULLSCREEN <b>⛶</b>'; fullscreenButton.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen'); resize(); });
resize(); renderHud(); animate();
if (location.pathname === '/host' || location.pathname === '/join') onlinePanel.classList.add('visible');