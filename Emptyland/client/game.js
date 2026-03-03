// ── 소켓 연결 ────────────────────────────────────────────
const socket = io();

// ── 게임 상태 ─────────────────────────────────────────────
const state = {
    myId: null,
    myNickname: '',
    myColor: '#ffffff',
    worldWidth: 2400,
    worldHeight: 1600,

    // 서버에서 받은 플레이어 목록 { id, nickname, x, y, color }
    remotePlayers: {},

    // 내 플레이어 (클라이언트 예측용)
    me: { x: 0, y: 0 },

    // 카메라
    cam: { x: 0, y: 0 },

    // 키 입력 상태
    keys: { up: false, down: false, left: false, right: false },

    // 마지막으로 서버에 보낸 입력
    lastInput: { dx: 0, dy: 0 },

    inGame: false,
};

// ── Canvas 설정 ───────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── 픽셀아트 상수 ─────────────────────────────────────────
const TILE = 16;          // 타일 크기 (표시용 그리드)
const PLAYER_SIZE = 20;   // 플레이어 스프라이트 크기

// 배경 패턴 색상
const BG_COLOR_A = '#0e0e1f';
const BG_COLOR_B = '#101024';

// ── 소켓 이벤트 ───────────────────────────────────────────
socket.on('init', (data) => {
    state.myId = data.id;
    state.myColor = data.color;
    state.worldWidth = data.worldWidth;
    state.worldHeight = data.worldHeight;
    state.me.x = data.spawnX;
    state.me.y = data.spawnY;
    state.cam.x = data.spawnX;
    state.cam.y = data.spawnY;
});

socket.on('gameState', (players) => {
    // 원격 플레이어 업데이트 (나 자신 제외)
    const newRemote = {};
    for (const p of players) {
        if (p.id === state.myId) {
            // 서버 권위: 내 위치를 서버 값으로 교정 (큰 오차 시)
            const dx = p.x - state.me.x;
            const dy = p.y - state.me.y;
            if (Math.abs(dx) > 40 || Math.abs(dy) > 40) {
                state.me.x = p.x;
                state.me.y = p.y;
            }
            continue;
        }

        // 기존 위치가 있으면 보간 목표값만 업데이트
        if (state.remotePlayers[p.id]) {
            state.remotePlayers[p.id].targetX = p.x;
            state.remotePlayers[p.id].targetY = p.y;
            state.remotePlayers[p.id].nickname = p.nickname;
            state.remotePlayers[p.id].color = p.color;
            newRemote[p.id] = state.remotePlayers[p.id];
        } else {
            // 새 플레이어: 현재 위치 = 목표 위치
            newRemote[p.id] = {
                id: p.id,
                nickname: p.nickname,
                color: p.color,
                x: p.x,
                y: p.y,
                targetX: p.x,
                targetY: p.y,
            };
        }
    }
    state.remotePlayers = newRemote;
});

// ── 키보드 입력 ───────────────────────────────────────────
window.addEventListener('keydown', (e) => {
    if (!state.inGame) return;
    switch (e.code) {
        case 'ArrowUp': case 'KeyW': state.keys.up = true; break;
        case 'ArrowDown': case 'KeyS': state.keys.down = true; break;
        case 'ArrowLeft': case 'KeyA': state.keys.left = true; break;
        case 'ArrowRight': case 'KeyD': state.keys.right = true; break;
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'ArrowUp': case 'KeyW': state.keys.up = false; break;
        case 'ArrowDown': case 'KeyS': state.keys.down = false; break;
        case 'ArrowLeft': case 'KeyA': state.keys.left = false; break;
        case 'ArrowRight': case 'KeyD': state.keys.right = false; break;
    }
});

// ── 입력 전송 (20ms 주기) ─────────────────────────────────
const CLIENT_SPEED = 3; // 클라이언트 예측 속도 (서버와 동일하게)

setInterval(() => {
    if (!state.inGame) return;

    let dx = 0, dy = 0;
    if (state.keys.up) dy -= 1;
    if (state.keys.down) dy += 1;
    if (state.keys.left) dx -= 1;
    if (state.keys.right) dx += 1;

    // 대각선 정규화
    if (dx !== 0 && dy !== 0) {
        const inv = 1 / Math.sqrt(2);
        dx *= inv;
        dy *= inv;
    }

    // 입력이 바뀐 경우만 서버로 전송
    if (dx !== state.lastInput.dx || dy !== state.lastInput.dy) {
        socket.emit('playerInput', { dx, dy });
        state.lastInput = { dx, dy };
    }

    // 클라이언트 사이드 예측 (즉각 응답감)
    if (dx !== 0 || dy !== 0) {
        state.me.x = Math.max(0, Math.min(state.worldWidth, state.me.x + dx * CLIENT_SPEED));
        state.me.y = Math.max(0, Math.min(state.worldHeight, state.me.y + dy * CLIENT_SPEED));
    }
}, 20);

// ── 렌더링 ────────────────────────────────────────────────
const LERP_FACTOR = 0.18; // 원격 플레이어 보간 계수

function lerp(a, b, t) { return a + (b - a) * t; }

function updateCamera() {
    // 카메라를 내 플레이어로 부드럽게 추적
    const targetCamX = state.me.x;
    const targetCamY = state.me.y;
    state.cam.x = lerp(state.cam.x, targetCamX, 0.12);
    state.cam.y = lerp(state.cam.y, targetCamY, 0.12);
}

function worldToScreen(wx, wy) {
    return {
        sx: wx - state.cam.x + canvas.width / 2,
        sy: wy - state.cam.y + canvas.height / 2,
    };
}

function drawBackground() {
    const W = canvas.width;
    const H = canvas.height;

    // 기본 배경
    ctx.fillStyle = BG_COLOR_A;
    ctx.fillRect(0, 0, W, H);

    // 격자 (월드 공간)
    const offsetX = (-(state.cam.x % TILE) + W / 2) % TILE;
    const offsetY = (-(state.cam.y % TILE) + H / 2) % TILE;

    ctx.strokeStyle = BG_COLOR_B;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = offsetX - TILE; x < W + TILE; x += TILE) {
        ctx.moveTo(Math.floor(x) + 0.5, 0);
        ctx.lineTo(Math.floor(x) + 0.5, H);
    }
    for (let y = offsetY - TILE; y < H + TILE; y += TILE) {
        ctx.moveTo(0, Math.floor(y) + 0.5);
        ctx.lineTo(W, Math.floor(y) + 0.5);
    }
    ctx.stroke();

    // 월드 경계선
    const tl = worldToScreen(0, 0);
    const br = worldToScreen(state.worldWidth, state.worldHeight);
    ctx.strokeStyle = '#2a1a5a';
    ctx.lineWidth = 2;
    ctx.strokeRect(tl.sx, tl.sy, br.sx - tl.sx, br.sy - tl.sy);
}

function drawPlayer(sx, sy, color, nickname, isMe) {
    const s = PLAYER_SIZE;
    const hs = s / 2;

    ctx.save();
    ctx.translate(Math.round(sx), Math.round(sy));

    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(-hs + 2, hs - 2, s, 4);

    // 몸체 (픽셀아트 느낌: 단순 사각형 + 눈)
    ctx.fillStyle = color;
    ctx.fillRect(-hs, -hs, s, s);

    // 테두리
    ctx.strokeStyle = isMe ? '#ffffff' : 'rgba(0,0,0,0.5)';
    ctx.lineWidth = isMe ? 2 : 1;
    ctx.strokeRect(-hs, -hs, s, s);

    // 눈 (2픽셀짜리)
    ctx.fillStyle = isMe ? '#000' : '#fff';
    ctx.fillRect(-5, -4, 3, 3);
    ctx.fillRect(2, -4, 3, 3);

    // 닉네임 라벨
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const label = nickname || '';
    const textW = ctx.measureText(label).width;
    const padX = 5, padY = 3;
    const lx = -(textW / 2) - padX;
    const ly = -hs - 14 - padY;

    // 배경 박스
    ctx.fillStyle = 'rgba(13,13,26,0.8)';
    ctx.fillRect(lx, ly, textW + padX * 2, 11 + padY * 2);

    // 텍스트
    ctx.fillStyle = isMe ? '#e0d0ff' : '#c0c0e0';
    ctx.fillText(label, 0, -hs - 14);

    ctx.restore();
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!state.inGame) {
        requestAnimationFrame(render);
        return;
    }

    updateCamera();
    drawBackground();

    // 원격 플레이어 보간 + 렌더
    for (const id in state.remotePlayers) {
        const p = state.remotePlayers[id];
        p.x = lerp(p.x, p.targetX, LERP_FACTOR);
        p.y = lerp(p.y, p.targetY, LERP_FACTOR);

        const { sx, sy } = worldToScreen(p.x, p.y);
        drawPlayer(sx, sy, p.color, p.nickname, false);
    }

    // 내 플레이어
    const { sx, sy } = worldToScreen(state.me.x, state.me.y);
    drawPlayer(sx, sy, state.myColor, state.myNickname, true);

    // HUD 업데이트
    const total = Object.keys(state.remotePlayers).length + 1;
    document.getElementById('hudPlayerCount').textContent = `👥 ${total}명`;

    requestAnimationFrame(render);
}

// ── 로비 UI ───────────────────────────────────────────────
const lobbyEl = document.getElementById('lobby');
const inputEl = document.getElementById('nicknameInput');
const startBtn = document.getElementById('startBtn');
const hudEl = document.getElementById('hud');
const hudNick = document.getElementById('hudNickname');

function enterGame() {
    const nick = inputEl.value.trim();
    if (!nick) {
        inputEl.focus();
        inputEl.classList.add('shake');
        setTimeout(() => inputEl.classList.remove('shake'), 400);
        return;
    }
    state.myNickname = nick;
    socket.emit('setNickname', nick);

    lobbyEl.classList.add('hidden');
    hudEl.classList.remove('hidden');
    hudNick.textContent = `🎮 ${nick}`;
    state.inGame = true;
    inputEl.blur();
}

startBtn.addEventListener('click', enterGame);
inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') enterGame();
});

// 게임 루프 시작
render();
