const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// 정적 파일 서빙 (client 폴더)
app.use(express.static(path.join(__dirname, '../client')));

// ── 게임 상수 ─────────────────────────────────────────────
const WORLD_WIDTH = 2400;   // 픽셀 단위 월드 너비
const WORLD_HEIGHT = 1600;  // 픽셀 단위 월드 높이
const PLAYER_SPEED = 3;     // 서버 틱당 이동 픽셀
const TICK_RATE = 20;       // 서버 업데이트 주기 (ms) = 50fps

// ── 플레이어 저장소 ───────────────────────────────────────
// { socketId: { id, nickname, x, y, dx, dy, color } }
const players = {};

// 플레이어 픽셀아트 색상 팔레트
const PLAYER_COLORS = [
  '#e63946', '#457b9d', '#2a9d8f', '#e9c46a',
  '#f4a261', '#a8dadc', '#b5838d', '#6d6875',
];
let colorIndex = 0;

function randomSpawn() {
  const margin = 80;
  return {
    x: Math.floor(Math.random() * (WORLD_WIDTH - margin * 2) + margin),
    y: Math.floor(Math.random() * (WORLD_HEIGHT - margin * 2) + margin),
  };
}

// ── 서버 게임 루프 ────────────────────────────────────────
setInterval(() => {
  // 모든 플레이어 위치 업데이트
  let changed = false;
  for (const id in players) {
    const p = players[id];
    if (!p.nickname) continue; // 닉네임 미설정 플레이어 제외

    let newX = p.x + p.dx * PLAYER_SPEED;
    let newY = p.y + p.dy * PLAYER_SPEED;

    // 월드 경계 클램프
    newX = Math.max(0, Math.min(WORLD_WIDTH, newX));
    newY = Math.max(0, Math.min(WORLD_HEIGHT, newY));

    if (newX !== p.x || newY !== p.y) {
      p.x = newX;
      p.y = newY;
      changed = true;
    }
  }

  // 변화가 있으면 전체 상태 브로드캐스트
  if (changed) {
    io.emit('gameState', buildGameState());
  }
}, TICK_RATE);

function buildGameState() {
  return Object.values(players)
    .filter(p => p.nickname)
    .map(p => ({
      id: p.id,
      nickname: p.nickname,
      x: p.x,
      y: p.y,
      color: p.color,
    }));
}

// ── 소켓 이벤트 ───────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  const spawn = randomSpawn();
  players[socket.id] = {
    id: socket.id,
    nickname: null,
    x: spawn.x,
    y: spawn.y,
    dx: 0,
    dy: 0,
    color: PLAYER_COLORS[colorIndex % PLAYER_COLORS.length],
  };
  colorIndex++;

  // 접속한 클라이언트에게 자신의 ID와 월드 크기 전달
  socket.emit('init', {
    id: socket.id,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    spawnX: spawn.x,
    spawnY: spawn.y,
    color: players[socket.id].color,
  });

  // 닉네임 설정
  socket.on('setNickname', (nickname) => {
    const trimmed = String(nickname).trim().slice(0, 12);
    if (!trimmed) return;

    players[socket.id].nickname = trimmed;
    console.log(`[nickname] ${socket.id} → "${trimmed}"`);

    // 전체에게 현재 게임 상태 브로드캐스트
    io.emit('gameState', buildGameState());
  });

  // 입력 처리 (방향 벡터: dx, dy 각각 -1, 0, 1)
  socket.on('playerInput', ({ dx, dy }) => {
    const p = players[socket.id];
    if (!p || !p.nickname) return;

    // 정규화 (대각선이라도 일정 속도)
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      p.dx = dx / len;
      p.dy = dy / len;
    } else {
      p.dx = 0;
      p.dy = 0;
    }
  });

  // 접속 해제
  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
    delete players[socket.id];
    io.emit('gameState', buildGameState());
  });
});

// ── 서버 시작 ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Emptyland server running on port ${PORT}`);
});
