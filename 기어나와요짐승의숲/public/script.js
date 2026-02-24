const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusElement = document.getElementById('status');

let players = {};
let myId = null;

// 플레이어 물리 설정
const charSize = 30;
let myX = 400;
let myY = 300;
let velX = 0;
let velY = 0;
const speed = 5;
const jumpForce = 12;
const gravity = 0.5;
const friction = 0.8;
let canJump = false;

const keys = {};

socket.on('connect', () => {
    myId = socket.id;
    statusElement.textContent = '연결됨 (ID: ' + myId + ')';
    statusElement.className = 'connected';
});

socket.on('updatePlayers', (serverPlayers) => {
    players = serverPlayers;
});

// 키 입력 감지
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function update() {
    // 이동 로직
    if (keys['ArrowLeft'] || keys['KeyA']) velX = -speed;
    else if (keys['ArrowRight'] || keys['KeyD']) velX = speed;
    else velX *= friction;

    // 점프 로직
    if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && canJump) {
        velY = -jumpForce;
        canJump = false;
    }

    // 중력 및 이동 적용
    velY += gravity;
    myX += velX;
    myY += velY;

    // 바닥 충돌 (기본)
    if (myY + charSize > canvas.height - 20) {
        myY = canvas.height - 20 - charSize;
        velY = 0;
        canJump = true;
    }

    // 간단한 플랫폼 추가 (임시)
    const platform = { x: 300, y: 450, w: 200, h: 20 };
    if (myX + charSize > platform.x && myX < platform.x + platform.w &&
        myY + charSize > platform.y && myY + charSize < platform.y + platform.h + 10 &&
        velY >= 0) {
        myY = platform.y - charSize;
        velY = 0;
        canJump = true;
    }

    // 벽 충돌 (좌우)
    if (myX < 0) myX = 0;
    if (myX + charSize > canvas.width) myX = canvas.width - charSize;

    // 서버에 내 위치 전송
    socket.emit('move', { x: myX, y: myY });

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 배경 및 바닥 그리기
    ctx.fillStyle = '#ebf5fb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#27ae60'; // 풀밭 바닥
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

    // 플랫폼 그리기
    ctx.fillStyle = '#8e44ad';
    ctx.fillRect(300, 450, 200, 20);

    // 모든 플레이어 그리기
    for (let id in players) {
        const p = players[id];
        const isMe = (id === myId);

        // 몸체
        ctx.fillStyle = isMe ? '#3498db' : (p.color || '#e74c3c');
        ctx.fillRect(p.x, p.y, charSize, charSize);

        // 테두리
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = isMe ? 3 : 1;
        ctx.strokeRect(p.x, p.y, charSize, charSize);

        // 눈 (간단하게)
        ctx.fillStyle = '#000';
        ctx.fillRect(p.x + 5, p.y + 5, 5, 5);
        ctx.fillRect(p.x + 20, p.y + 5, 5, 5);

        // 닉네임 표시 (ID 일부)
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.fillText(id.substring(0, 5), p.x, p.y - 5);
    }
}

update();
