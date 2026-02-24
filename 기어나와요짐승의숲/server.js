const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// 정적 파일 제공 (public 폴더)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 플레이어 상태 관리 객체
const players = {};

// 소켓 연결 설정
io.on('connection', (socket) => {
    console.log('새로운 사용자가 접속했습니다:', socket.id);

    // 새 플레이어 추가
    players[socket.id] = {
        x: 400,
        y: 300,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16) // 랜덤 색상
    };

    // 모든 클라이언트에게 현재 플레이어 상태 전송
    io.emit('updatePlayers', players);

    // 이동 입력 처리
    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            // 모든 클라이언트에 위치 동기화
            io.emit('updatePlayers', players);
        }
    });

    // 연결 해제 시
    socket.on('disconnect', () => {
        console.log('사용자가 나갔습니다:', socket.id);
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});

server.listen(PORT, () => {
    console.log(`서버가 실행 중입니다: http://localhost:${PORT}`);
});
